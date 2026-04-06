export type Message = {
  id?: string;
  role: 'user' | 'model' | 'function';
  content: string;
  functionCalls?: { name: string; args: any }[];
  functionResponses?: { name: string; response: any }[];
};

const CACHE_KEY_PREFIX = 'gide_ai_cache_';

function getCacheKey(messages: Message[], model: string, systemInstruction: string, temperature: number): string {
  return `${CACHE_KEY_PREFIX}${JSON.stringify({messages, model, systemInstruction, temperature})}`;
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
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      onChunk(parsed.text, parsed.functionCalls);
    } catch (e) {
      onChunk(cached);
    }
    return;
  }

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, model, apiKey, systemInstruction, temperature })
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
  localStorage.setItem(cacheKey, JSON.stringify({ text: fullResponse, functionCalls: allFunctionCalls }));
}
