export type Message = {
  role: 'user' | 'model';
  content: string;
};

export async function streamGemini(
  messages: Message[],
  model: string,
  apiKey: string,
  systemInstruction: string,
  onChunk: (text: string) => void,
  temperature: number = 0.7
) {
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
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) onChunk(text);
        } catch (e) {
          console.error("Error parsing chunk", e);
        }
      }
    }
  }
}
