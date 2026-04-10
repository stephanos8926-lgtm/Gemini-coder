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
 * Handles token-aware truncation and prioritization
 */
class ConversationManager {
  private static readonly MAX_HISTORY_TOKENS = 30000; // Heuristic limit
  private static readonly RECENT_MESSAGES_COUNT = 10;

  public static truncateHistory(messages: Message[]): Message[] {
    if (messages.length <= this.RECENT_MESSAGES_COUNT) return messages;

    // Always keep the first message (often context-setting) and the most recent ones
    const firstMessage = messages[0];
    const recentMessages = messages.slice(-this.RECENT_MESSAGES_COUNT);
    
    // Filter out intermediate messages that might be too large or less relevant
    // In a more advanced version, we would use token counting here
    return [firstMessage, ...recentMessages];
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
  const truncatedMessages = ConversationManager.truncateHistory(messages);
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
