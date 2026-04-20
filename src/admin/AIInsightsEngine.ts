import { GoogleGenerativeAI } from '@google/generative-ai';
import { TelemetryMetrics } from './TelemetryAggregator';

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function getAiInsights(metrics: TelemetryMetrics) {
  const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const prompt = `Analyze the following telemetry data and provide insights, recommendations, and a summary: ${JSON.stringify(metrics)}`;
  
  const result = await model.generateContent(prompt);
  return result.response.text();
}
