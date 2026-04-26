import { AIFilter, AIContext, AIRuntimeState, AIFilterResponse, AIResponseFilterResult } from '../types';
import { parse } from '@babel/parser';

/**
 * ValidatorFilter
 * Identifies code blocks in LLM responses and performs syntax validation using @babel/parser.
 */
export class ValidatorFilter implements AIFilter {
  name = 'ValidatorFilter';
  priority = 200;

  private codeBlockRegex = /```(\w+)?\n([\s\S]+?)\n```/g;

  async onResponse(content: string, context: AIContext, state: AIRuntimeState, final: boolean): Promise<AIResponseFilterResult> {
    if (!final) return { content, state, final };

    const matches = [...content.matchAll(this.codeBlockRegex)];
    
    for (const match of matches) {
      const language = match[1];
      const code = match[2];

      if (language === 'typescript' || language === 'javascript' || language === 'ts' || language === 'js') {
        try {
          // Use Babel parser for secure static syntax analysis
          parse(code, {
            sourceType: 'module',
            plugins: ['typescript', 'jsx'],
          });
        } catch (e) {
          if (!state.warnings) state.warnings = [];
          const errMsg = e instanceof Error ? e.message : 'Unknown syntax error';
          console.error(`[ValidatorFilter] Syntax Error in ${language} block:`, errMsg);
          state.warnings.push(`Syntax error in AI generated ${language} block: The generated code is invalid and will not execute: ${errMsg}`);
        }
      }
    }

    return { content, state, final };
  }
}
