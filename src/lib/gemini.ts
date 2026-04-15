const API_BASE = import.meta.env.VITE_API_BASE || '';

export type Message = {
  id?: string;
  role: 'user' | 'model' | 'function';
  content: string;
  functionCalls?: { name: string; args: any }[];
  functionResponses?: { name: string; response: any }[];
};

// In-memory cache for current session only - cleared on page refresh
const inMemoryCache = new Map<string, { text: string; functionCalls?: any[] }>();

/**
 * Intelligent Conversation Manager
 * Handles token-aware truncation, AST-based summarization, and advanced compression
 */
class ConversationManager {
  private static readonly MAX_HISTORY_TOKENS = 30000; // Heuristic limit
  private static readonly RECENT_MESSAGES_COUNT = 10;
  private static readonly CHARS_PER_TOKEN = 4;

  private static estimateTokens(text: string): number {
    return Math.ceil(text.length / this.CHARS_PER_TOKEN);
  }

  /**
   * Pseudo-AST summarization using regex to extract signatures from large code blocks.
   * This compresses file content while retaining structural relevance.
   */
  private static summarizeCodeBlocks(content: string): string {
    if (content.length < 2000) return content; // Don't summarize small snippets

    return content.replace(/```(?:typescript|javascript|ts|js)\n([\s\S]*?)```/g, (match, code) => {
      if (code.length < 1000) return match;

      const signatures: string[] = [];
      const lines = code.split('\n');
      let inFunction = false;
      let braceDepth = 0;

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('import ') || trimmed.startsWith('export interface ') || trimmed.startsWith('export type ')) {
          signatures.push(line);
        } else if (trimmed.match(/^(?:export )?(?:async )?(?:function|class) /) || trimmed.match(/^(?:export )?(?:const|let|var) .*=.*(?:=>|function)/)) {
          signatures.push(line);
          inFunction = true;
        }

        if (inFunction) {
          braceDepth += (line.match(/\{/g) || []).length;
          braceDepth -= (line.match(/\}/g) || []).length;
          if (braceDepth <= 0) {
            inFunction = false;
            signatures.push('  // ... implementation elided by AST summarizer ...');
            signatures.push('}');
          }
        }
      }

      return `\`\`\`typescript\n// [AST Summarized Code Block]\n${signatures.join('\n')}\n\`\`\``;
    });
  }

  public static truncateHistory(messages: Message[], systemInstruction: string = ''): Message[] {
    if (messages.length <= 2) return messages;

    const firstMessage = messages[0];
    let recentMessages = messages.slice(-this.RECENT_MESSAGES_COUNT);
    let intermediateMessages = messages.slice(1, -this.RECENT_MESSAGES_COUNT);

    // 1. Apply AST-based summarization to intermediate messages to compress them
    intermediateMessages = intermediateMessages.map(msg => ({
      ...msg,
      content: this.summarizeCodeBlocks(msg.content)
    }));

    // 2. Token-aware truncation
    const systemTokens = this.estimateTokens(systemInstruction);
    let totalTokens = this.estimateTokens(firstMessage.content) + systemTokens;
    const finalMessages: Message[] = [];

    // Always include recent messages (they are most relevant)
    for (let i = recentMessages.length - 1; i >= 0; i--) {
      const msg = recentMessages[i];
      const tokens = this.estimateTokens(msg.content);
      if (totalTokens + tokens > this.MAX_HISTORY_TOKENS && finalMessages.length > 0) {
        // We hit the limit even within recent messages. We must truncate the content of this message.
        const allowedChars = (this.MAX_HISTORY_TOKENS - totalTokens) * this.CHARS_PER_TOKEN;
        if (allowedChars > 100) {
           finalMessages.unshift({
             ...msg,
             content: msg.content.substring(0, allowedChars) + '\n...[TRUNCATED DUE TO TOKEN LIMIT]...'
           });
           totalTokens += this.estimateTokens(finalMessages[0].content);
        }
        break;
      }
      finalMessages.unshift(msg);
      totalTokens += tokens;
    }

    // 3. Add intermediate messages if we still have token budget
    for (let i = intermediateMessages.length - 1; i >= 0; i--) {
      if (totalTokens >= this.MAX_HISTORY_TOKENS) break;
      const msg = intermediateMessages[i];
      const tokens = this.estimateTokens(msg.content);
      
      if (totalTokens + tokens <= this.MAX_HISTORY_TOKENS) {
        finalMessages.unshift(msg);
        totalTokens += tokens;
      } else {
        // Compress the message into a tiny summary instead of dropping it completely
        finalMessages.unshift({
          role: msg.role,
          content: `[Message compressed. Original length: ${msg.content.length} chars]`
        });
        totalTokens += 20; // Approx tokens for the summary string
      }
    }

    return [firstMessage, ...finalMessages];
  }
}

function getCacheKey(messages: Message[], model: string, systemInstruction: string, temperature: number): string {
  const base = JSON.stringify({ model, systemInstruction, temperature });
  const msgHash = messages.length + '_' + (messages[messages.length - 1]?.content?.length || 0);
  return `gemini_cache_${base}_${msgHash}`;
}

export async function streamGemini(
  messages: Message[],
  model: string,
  apiKey: string,
  systemInstruction: string,
  onChunk: (text: string, functionCalls?: { name: string; args: any }[]) => void,
  temperature: number = 0.7
) {
  const truncatedMessages = ConversationManager.truncateHistory(messages, systemInstruction);
  const cacheKey = getCacheKey(truncatedMessages, model, systemInstruction, temperature);
  
  // SECURITY: Check in-memory cache only (session-bound)
  const cached = inMemoryCache.get(cacheKey);
  if (cached) {
    try {
      onChunk(cached.text, cached.functionCalls);
    } catch (e) {
      // If cache is corrupt, clear it and fetch fresh
      console.warn('Invalid cache detected, clearing...');
      inMemoryCache.delete(cacheKey);
    }
    return;
  }

  const response = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: truncatedMessages, model, apiKey, systemInstruction, temperature }),
  });

  if (!response.ok) {
    const err = await response.text();
    const sanitizedErr = err.replace(/key=[^&]*/g, 'key=[REDACTED]');
    throw new Error(`HTTP ${response.status}: ${sanitizedErr}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  
  if (!reader) throw new Error("No reader");

  let buffer = '';
  let fullResponse = '';
  let chunkBuffer = '';
  let allFunctionCalls: { name: string; args: any }[] = [];
  let lastCallCount = 0;
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; 
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const dataStr = line.slice(6);
        if (dataStr === '[DONE]') continue;
        try {
          const data = JSON.parse(dataStr);
          const parts = data.candidates?.[0]?.content?.parts || [];
          
          let hasNewFunctionCall = false;
          for (const part of parts) {
            if (part.text) {
              if (fullResponse.length < 500000) {
                fullResponse += part.text;
              }
              chunkBuffer += part.text;
            }
            if (part.functionCall) {
              allFunctionCalls.push(part.functionCall);
              hasNewFunctionCall = true;
            }
          }

          if (chunkBuffer.length > 50 || hasNewFunctionCall) {
            // FIXED: Only send NEW function calls to prevent re-executing previous ones
            const newCalls = allFunctionCalls.slice(lastCallCount);
            lastCallCount = allFunctionCalls.length;
            
            onChunk(chunkBuffer, newCalls.length > 0 ? newCalls : undefined);
            chunkBuffer = '';
          }
        } catch (e) {
          console.error("STREAM PARSE FAILURE", {
            error: e,
            raw: dataStr
          });
        }
      }
    }
  }
  
  if (chunkBuffer || allFunctionCalls.length > 0) {
    const newCalls = allFunctionCalls.slice(lastCallCount);
    onChunk(chunkBuffer, newCalls.length > 0 ? newCalls : undefined);
  }
  
  // Cache in memory only for this session
  // Note: This cache is cleared when the page refreshes or browser closes
  // For persistence, implement server-side session storage with encryption
  try {
    const payload = JSON.stringify({ text: fullResponse, functionCalls: allFunctionCalls });
    if (payload.length < 1000000) {
      inMemoryCache.set(cacheKey, { text: fullResponse, functionCalls: allFunctionCalls });
    }
  } catch (e) {
    console.warn("Cache write skipped:", e);
  }
  
  // Limit cache size to prevent memory exhaustion
  if (inMemoryCache.size > 50) {
    const firstKey = inMemoryCache.keys().next().value;
    if (firstKey) inMemoryCache.delete(firstKey);
  }
}
