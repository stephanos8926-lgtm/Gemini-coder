import { AIFilter, AIContext, AIRuntimeState, AIFilterResponse, AIResponseFilterResult } from '../types';
import { Message } from '../../../lib/gemini';

/**
 * SecurityFilter
 * Audits prompts for potential "Context Injection" or "Jailbreak" attempts.
 */
export class SecurityFilter implements AIFilter {
  name = 'SecurityFilter';
  priority = 8;

  private blacklist = [
    /ignore previous instructions/i,
    /system prompt/i,
    /developer mode/i,
    /bypass/i,
    /\<script\>/i,
    /password/i,
  ];

  async onRequest(messages: Message[], context: AIContext, state: AIRuntimeState): Promise<AIFilterResponse> {
    const lastMessage = messages[messages.length - 1];
    
    if (lastMessage && lastMessage.role === 'user') {
      const suspicious = this.blacklist.some(regex => regex.test(lastMessage.content));
      
      if (suspicious) {
        if (!state.warnings) state.warnings = [];
        state.warnings.push('Potential system prompt injection detected.');
        console.warn('[SecurityAudit] Flagged suspicious prompt:', lastMessage.content);
        
        // We could chose to redact or block here. 
        // For now, we just flag it.
      }
    }

    return { messages, context, state };
  }

  async onResponse(content: string, context: AIContext, state: AIRuntimeState, final: boolean): Promise<AIResponseFilterResult> {
    // Response check can flag if the LLM leaked system instructions
    if (content.toLowerCase().includes('as an ai language model, i cannot')) {
      // standard refusal, might be interesting for metrics
    }
    return { content, state, final };
  }
}
