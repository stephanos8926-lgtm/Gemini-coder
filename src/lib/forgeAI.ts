import { Message, streamGemini, callGemini } from './gemini';
import { aiPipeline } from '../services/ai/AIPipeline';
import { 
  PIIFilter, 
  BudgetFilter, 
  SecurityFilter, 
  CacheFilter, 
  ValidatorFilter 
} from '../services/ai/filters';
import { AIContext, AIRuntimeState } from '../services/ai/types';
import { ForgeGuard } from '../../packages/nexus/guard/ForgeGuard';

// Initialize the pipeline with standard filters
aiPipeline.addFilter(new BudgetFilter());
aiPipeline.addFilter(new SecurityFilter());
aiPipeline.addFilter(new PIIFilter());
aiPipeline.addFilter(new CacheFilter());
aiPipeline.addFilter(new ValidatorFilter());

let guard: ForgeGuard | null = null;
if (typeof window === 'undefined') {
  guard = ForgeGuard.init('ForgeAI');
}

export interface ForgeAIOptions {
  model: string;
  apiKey: string;
  systemInstruction?: string;
  temperature?: number;
  onChunk?: (text: string, functionCalls?: any[], state?: AIRuntimeState) => void;
  workspace?: string;
  userId?: string;
}

/**
 * ForgeAI
 * Higher-level AI service that wraps Gemini calls with the Intercepting Filter Pipeline.
 */
export const ForgeAI = {
  /**
   * stream
   * Streams a response from the LLM after passing through the Request filters,
   * and processes the incoming chunks through the Response filters.
   */
  async stream(messages: Message[], options: ForgeAIOptions) {
    return guard ? guard.protect(async () => this._stream(messages, options), { method: 'stream' }) : this._stream(messages, options);
  },

  async _stream(messages: Message[], options: ForgeAIOptions) {
    const context: AIContext = {
      model: options.model,
      systemInstruction: options.systemInstruction,
      temperature: options.temperature,
      workspace: options.workspace,
      userId: options.userId || 'anonymous',
      originalMessages: messages
    };

    // 1. Run Request Pipeline
    const reqResult = await aiPipeline.runRequest(messages, context);
    
    // 2. Check for short-circuit (Cache hit)
    if (reqResult.shortCircuitResponse) {
      if (options.onChunk) {
        options.onChunk(reqResult.shortCircuitResponse, undefined, reqResult.state);
      }
      return reqResult.shortCircuitResponse;
    }

    // 3. Perform the actual LLM call
    let fullResponse = '';
    let currentState = reqResult.state;

    await streamGemini(
      reqResult.messages,
      reqResult.context.model,
      options.apiKey,
      reqResult.context.systemInstruction || '',
      async (chunk, calls) => {
        // 4. Run Response Pipeline for each chunk (or buffer)
        const resResult = await aiPipeline.runResponse(chunk, reqResult.context, currentState, false);
        fullResponse += resResult.content;
        currentState = resResult.state;

        if (options.onChunk) {
          options.onChunk(resResult.content, calls, currentState);
        }
      },
      reqResult.context.temperature
    );

    // 5. Finalize the pipeline
    const finalResult = await aiPipeline.runResponse(fullResponse, reqResult.context, currentState, true);
    return finalResult.content;
  },

  /**
   * call
   * Non-streaming version.
   */
  async call(messages: Message[], options: ForgeAIOptions): Promise<string> {
    return guard ? guard.protect(async () => this._call(messages, options), { method: 'call' }) : this._call(messages, options);
  },

  async _call(messages: Message[], options: ForgeAIOptions): Promise<string> {
    const context: AIContext = {
      model: options.model,
      systemInstruction: options.systemInstruction,
      temperature: options.temperature,
      workspace: options.workspace,
      userId: options.userId || 'anonymous',
      originalMessages: messages
    };

    const reqResult = await aiPipeline.runRequest(messages, context);
    if (reqResult.shortCircuitResponse) return reqResult.shortCircuitResponse;

    const rawResponse = await callGemini(
      reqResult.messages,
      reqResult.context.model,
      options.apiKey,
      reqResult.context.systemInstruction || '',
      reqResult.context.temperature
    );

    const resResult = await aiPipeline.runResponse(rawResponse, reqResult.context, reqResult.state, true);
    return resResult.content;
  }
};
