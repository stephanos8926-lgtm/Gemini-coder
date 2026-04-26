import { AIFilter, AIContext, AIRuntimeState, AIFilterResponse, AIResponseFilterResult } from '../types';
import { Message } from '../../../lib/gemini';
import { get, set } from 'idb-keyval';
import fnv from 'fnv-plus';

/**
 * CacheFilter
 * Handles local (IDB) response caching and theoretically prepares for upstream 
 * Gemini Context Caching for large repositories.
 */
export class CacheFilter implements AIFilter {
  name = 'CacheFilter';
  priority = 100; // Run last in request (to have all redactions done)

  private sessionMap = new Map<string, string>();

  private getHash(messages: Message[], context: AIContext): string {
    const data = JSON.stringify({
      messages: messages.map(m => ({ r: m.role, c: m.content })),
      sys: context.systemInstruction,
      model: context.model
    });
    return fnv.hash(data).hex();
  }

  async onRequest(messages: Message[], context: AIContext, state: AIRuntimeState): Promise<AIFilterResponse> {
    // Only cache pure text user messages for now
    const hash = this.getHash(messages, context);
    
    // Check Tier 1 (Memory)
    const mem = this.sessionMap.get(hash);
    if (mem) {
      console.log('[CacheFilter] L1 Hit');
      return { messages, context, state: { ...state, cacheHit: true }, shortCircuitResponse: mem };
    }

    // Check Tier 3 (IDB)
    try {
      const persisted = await get(`ai_cache_${hash}`);
      if (persisted) {
        console.log('[CacheFilter] L3 Hit');
        this.sessionMap.set(hash, persisted);
        return { messages, context, state: { ...state, cacheHit: true }, shortCircuitResponse: persisted };
      }
    } catch (e) {
      console.warn('[CacheFilter] IDB lookup failed', e);
    }

    return { messages, context, state };
  }

  async onResponse(content: string, context: AIContext, state: AIRuntimeState, final: boolean): Promise<AIResponseFilterResult> {
    if (final && !state.cacheHit) {
      // Re-calculate hash for saving
      const hash = this.getHash(context.originalMessages || [], context);
      this.sessionMap.set(hash, content);
      
      try {
        await set(`ai_cache_${hash}`, content);
      } catch (e) {
         console.warn('[CacheFilter] IDB save failed', e);
      }
    }
    return { content, state, final };
  }
}
