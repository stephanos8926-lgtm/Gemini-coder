import { AIFilter, AIContext, AIRuntimeState, AIFilterResponse, AIResponseFilterResult } from '../types';
import { Message } from '../../../lib/gemini';

/**
 * BudgetFilter
 * Monitors token consumption and estimates cost. 
 * Can be used to block requests that exceed a set budget.
 */
export class BudgetFilter implements AIFilter {
  name = 'BudgetFilter';
  priority = 5; // Run early to see the raw request

  private estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token for English
    return Math.ceil(text.length / 4);
  }

  async onRequest(messages: Message[], context: AIContext, state: AIRuntimeState): Promise<AIFilterResponse> {
    const promptText = messages.map(m => m.content).join(' ');
    const estimatedTokens = this.estimateTokens(promptText);
    
    const newState = {
      ...state,
      estimatedRequestTokens: (state.estimatedRequestTokens || 0) + estimatedTokens
    };

    // Example safety gate
    const MAX_TOKENS = 32000;
    if (estimatedTokens > MAX_TOKENS) {
      if (!newState.warnings) newState.warnings = [];
      newState.warnings.push(`Extreme prompt length detected (${estimatedTokens} tokens).`);
    }

    return { messages, context, state: newState };
  }

  async onResponse(content: string, context: AIContext, state: AIRuntimeState, final: boolean): Promise<AIResponseFilterResult> {
    const chunkTokens = this.estimateTokens(content);
    const newState = {
      ...state,
      estimatedResponseTokens: (state.estimatedResponseTokens || 0) + chunkTokens
    };

    if (final) {
      const total = (newState.estimatedRequestTokens || 0) + (newState.estimatedResponseTokens || 0);
      console.log(`[BudgetAudit] Total predicted session tokens: ${total}`);
    }

    return { content, state: newState, final };
  }
}
