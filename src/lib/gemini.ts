export type Message = {
  id?: string;
  role: 'user' | 'model' | 'function';
  content: string;
  functionCalls?: { name: string; args: any }[];
  functionResponses?: { name: string; response: any }[];
};

// In-memory cache for current session only - cleared on page refresh
// WARNING: This is session-only. Do NOT store sensitive data in localStorage
// For persistent caching, implement server-side session storage with encryption
const inMemoryCache = new Map<string, { text: string; functionCalls?: any[] }>();

function getCacheKey(messages: Message[], model: string, systemInstruction: string, temperature: number): string {
  // Create cache key but DON'T use localStorage
  return `${model}:${temperature}:${messages.length}`;
}

export async function streamGemini(
  messages: Message[],
  model: string,
  apiKey: string,
  systemInstruction: string,
  onChunk: (text: string, functionCalls?: { name: string; args: any }[]) => void,
  temperature: number = 0.7
) {
  const cacheKey = getCacheKey(messages, model, systemInstruction, temperature);
  
  // SECURITY: Check in-memory cache only (session-bound)
  const cached = inMemoryCache.get(cacheKey);
  if (cached) {
    try {
      onChunk(cached.text, cached.functionCalls);
    } catch (e) {
      console.warn('In-memory cache parse error:', e);
    }
    return;
  }

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, model, apiKey, systemInstruction, temperature }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`HTTP ${response.status}: ${err}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  
  if (!reader) throw new Error("No reader");

  let buffer = '';
  let fullResponse = '';
  let chunkBuffer = '';
  let allFunctionCalls: { name: string; args: any }[] = [];
  
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
              fullResponse += part.text;
              chunkBuffer += part.text;
            }
            if (part.functionCall) {
              allFunctionCalls.push(part.functionCall);
              hasNewFunctionCall = true;
            }
          }

          if (chunkBuffer.length > 50 || hasNewFunctionCall) {
            onChunk(chunkBuffer, allFunctionCalls.length > 0 ? [...allFunctionCalls] : undefined);
            chunkBuffer = '';
          }
        } catch (e) {
          console.error("Error parsing chunk", e);
        }
      }
    }
  }
  
  if (chunkBuffer || allFunctionCalls.length > 0) {
    onChunk(chunkBuffer, allFunctionCalls.length > 0 ? allFunctionCalls : undefined);
  }
  
  // Cache in memory only for this session
  // Note: This cache is cleared when the page refreshes or browser closes
  // For persistence, implement server-side session storage with encryption
  inMemoryCache.set(cacheKey, { text: fullResponse, functionCalls: allFunctionCalls });
  
  // Limit cache size to prevent memory exhaustion
  if (inMemoryCache.size > 50) {
    const firstKey = inMemoryCache.keys().next().value;
    if (firstKey) inMemoryCache.delete(firstKey);
  }
}
