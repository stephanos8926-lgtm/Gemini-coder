import { GoogleGenerativeAI } from '@google/generative-ai';

let summarizerModel: any = null;
let currentApiKey: string | null = null;

function getSummarizer(apiKey: string) {
  if (!summarizerModel || currentApiKey !== apiKey) {
    const ai = new GoogleGenerativeAI(apiKey);
    summarizerModel = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
    currentApiKey = apiKey;
  }
  return summarizerModel;
}

export async function summarizeChatHistory(messages: any[], apiKey: string, previousSummary?: string): Promise<string> {
  const model = getSummarizer(apiKey);
  const prompt = previousSummary
    ? `Here is the previous summary of the chat history: "${previousSummary}".\n\nHere are the new messages: ${JSON.stringify(messages.slice(-10))}.\n\nUpdate the summary to include the new information while keeping it concise.`
    : `Summarize the following chat history to keep the context manageable, while preserving key technical decisions and task status:\n\n${JSON.stringify(messages)}`;
  const result = await model.generateContent(prompt);
  return result.response.text();
}
