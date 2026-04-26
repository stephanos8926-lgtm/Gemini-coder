import { Message } from '../../lib/gemini';
import { AIFilter, AIContext, AIRuntimeState, AIFilterResponse, AIResponseFilterResult } from './types';
import { ForgeGuard } from '../../../packages/nexus/guard/ForgeGuard';

let guard: ForgeGuard | null = null;
if (typeof window === 'undefined') {
  guard = ForgeGuard.init('AIPipeline');
}

/**
 * AIPipeline
 * Orchestrates the execution of multiple filters (Intercepting Filter Pattern)
 * for LLM requests and responses.
 */
export class AIPipeline {
  private filters: AIFilter[] = [];

  constructor(initialFilters: AIFilter[] = []) {
    this.filters = initialFilters.sort((a, b) => a.priority - b.priority);
  }

  public addFilter(filter: AIFilter) {
    this.filters.push(filter);
    this.filters.sort((a, b) => a.priority - b.priority);
  }

  public async runRequest(messages: Message[], context: AIContext): Promise<AIFilterResponse> {
    const action = async () => {
        let currentMessages = [...messages];
        let currentContext = { ...context };
        let currentState: AIRuntimeState = { warnings: [] };
    
        for (const filter of this.filters) {
          if (filter.onRequest) {
            const result = await filter.onRequest(currentMessages, currentContext, currentState);
            
            // If a filter provides a short circuit (like a cache hit), return immediately
            if (result.shortCircuitResponse) {
              return result;
            }
    
            currentMessages = result.messages;
            currentContext = result.context;
            currentState = result.state;
          }
        }
    
        return { messages: currentMessages, context: currentContext, state: currentState };
    };

    return guard ? guard.protect(action, { method: 'runRequest' }) : action();
  }

  public async runResponse(content: string, context: AIContext, state: AIRuntimeState, final: boolean): Promise<AIResponseFilterResult> {
    const action = async () => {
        let currentContent = content;
        let currentState = { ...state };
    
        for (const filter of this.filters) {
          if (filter.onResponse) {
            const result = await filter.onResponse(currentContent, context, currentState, final);
            currentContent = result.content;
            currentState = result.state;
          }
        }
    
        return { content: currentContent, state: currentState, final };
    };

    return guard ? guard.protect(action, { method: 'runResponse', final }) : action();
  }
}

export const aiPipeline = new AIPipeline();
