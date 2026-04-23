import { ConversationManager } from './ConversationManager';
import { SYSTEM_CONSTANTS } from '../constants/systemConstants';

const RW_API_BASE = SYSTEM_CONSTANTS.RW_API_BASE;

/**
 * @interface Message
 * @description Standardized interface for conversational messages between user and AI model.
 */
export type Message = {
  id?: string;
  role: 'user' | 'model' | 'function';
  content: string;
  functionCalls?: { name: string; args: any }[];
  functionResponses?: { name: string; response: any }[];
};

/** In-memory cache for current session only - cleared on page refresh */
const RW_inMemoryCache = new Map<string, { text: string; functionCalls?: any[]; timestamp: number }>();
const RW_MAX_CACHE_SIZE = SYSTEM_CONSTANTS.RW_MAX_CHAT_CACHE_SIZE;

/**
 * @function pruneCache
 * @description Implements LRU (Least Recently Used) pruning for the in-memory chat cache.
 */
function pruneCache() {
  if (RW_inMemoryCache.size <= RW_MAX_CACHE_SIZE) return;
  
  const entries = Array.from(RW_inMemoryCache.entries())
    .sort((a, b) => a[1].timestamp - b[1].timestamp);
  
  const toRemove = entries.slice(0, RW_inMemoryCache.size - RW_MAX_CACHE_SIZE);
  toRemove.forEach(([key]) => RW_inMemoryCache.delete(key));
}

/**
 * @function getCacheKey
 * @description Generates a deterministic cache key based on conversation history and generation parameters.
 */
function getCacheKey(messages: Message[], model: string, systemInstruction: string, temperature: number): string {
  const base = JSON.stringify({ model, systemInstruction, temperature });
  const msgHash = messages.length + '_' + (messages[messages.length - 1]?.content?.length || 0);
  return `gemini_cache_${base}_${msgHash}`;
}

/**
 * @function streamGemini
 * @description Orchestrates the streaming interaction with the Gemini AI model via the RapidForge backend API.
 */
export async function streamGemini(
  messages: Message[],
  model: string,
  apiKey: string,
  systemInstruction: string,
  onChunk: (text: string, functionCalls?: { name: string; args: any }[]) => void,
  temperature: number = SYSTEM_CONSTANTS.RW_DEFAULT_TEMPERATURE
) {
  const manager = new ConversationManager(systemInstruction);
  messages.forEach(msg => manager.addMessage(msg));
  const truncatedMessages = manager.getTruncatedHistory();
  const cacheKey = getCacheKey(truncatedMessages, model, systemInstruction, temperature);
  
  const cached = RW_inMemoryCache.get(cacheKey);
  if (cached) {
    cached.timestamp = Date.now();
    try {
      onChunk(cached.text, cached.functionCalls);
    } catch (e) {
      RW_inMemoryCache.delete(cacheKey);
    }
    return;
  }

  const response = await fetch(`${RW_API_BASE}/api/chat`, {
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

  let fullResponse = '';
  let chunkBuffer = '';
  let allFunctionCalls: { name: string; args: any }[] = [];
  let lastCallCount = 0;
  
  let buffer = '';
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
              if (fullResponse.length < SYSTEM_CONSTANTS.RW_MAX_RESPONSE_CHUNK_LENGTH) {
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
            const newCalls = allFunctionCalls.slice(lastCallCount);
            lastCallCount = allFunctionCalls.length;
            
            onChunk(chunkBuffer, newCalls.length > 0 ? newCalls : undefined);
            chunkBuffer = '';
          }
        } catch (e) {
          console.error("STREAM PARSE FAILURE", { error: e });
        }
      }
    }
  }
  
  if (chunkBuffer || allFunctionCalls.length > 0) {
    const newCalls = allFunctionCalls.slice(lastCallCount);
    onChunk(chunkBuffer, newCalls.length > 0 ? newCalls : undefined);
  }
  
  try {
    const payload = JSON.stringify({ text: fullResponse, functionCalls: allFunctionCalls });
    if (payload.length < 1000000) {
      RW_inMemoryCache.set(cacheKey, { 
        text: fullResponse, 
        functionCalls: allFunctionCalls,
        timestamp: Date.now()
      });
      pruneCache();
    }
  } catch (e) {
    console.warn("Cache write skipped:", e);
  }
}

/**
 * @function callGemini
 * @description Standard non-streaming POST request to Gemini for short responses.
 */
export async function callGemini(
  messages: Message[],
  model: string,
  apiKey: string,
  systemInstruction: string,
  temperature: number = SYSTEM_CONSTANTS.RW_DEFAULT_TEMPERATURE
): Promise<string> {
  const response = await fetch(`${RW_API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, model, apiKey, systemInstruction, temperature, stream: false }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`HTTP ${response.status}: ${err}`);
  }

  const result = await response.json();
  return result.candidates?.[0]?.content?.parts?.[0]?.text || '';
}
