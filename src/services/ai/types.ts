import { Message } from '../../lib/gemini';

export interface AIContext {
  model: string;
  systemInstruction?: string;
  temperature?: number;
  workspace?: string;
  userId: string;
  tools?: any[];
  [key: string]: any;
}

export interface AIRuntimeState {
  tokensUsed?: number;
  estimatedRequestTokens?: number;
  estimatedResponseTokens?: number;
  latency?: number;
  cacheHit?: boolean;
  warnings?: string[];
  [key: string]: any;
}

export interface AIFilterResponse {
  messages: Message[];
  context: AIContext;
  state: AIRuntimeState;
  shortCircuitResponse?: string; // If a filter (like cache) wants to return early
}

export interface AIResponseFilterResult {
  content: string;
  state: AIRuntimeState;
  final: boolean; // Is it the end of a stream?
}

export interface AIFilter {
  name: string;
  priority: number;
  
  // Applied before the request is sent to the LLM
  onRequest?: (messages: Message[], context: AIContext, state: AIRuntimeState) => Promise<AIFilterResponse>;
  
  // Applied to the response chunks (for streaming) or final response
  onResponse?: (content: string, context: AIContext, state: AIRuntimeState, final: boolean) => Promise<AIResponseFilterResult>;
}
