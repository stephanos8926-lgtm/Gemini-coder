import { ProjectContextEngine } from '../utils/ProjectContextEngine';
import { ForgeGuard } from '../utils/ForgeWrappers';
import type { ForgeGuard as ForgeGuardType } from '../../packages/nexus/guard/ForgeGuard';

export interface LogAnalysis {
  rootCause: string;
  suggestedFix: string;
  relevantFiles: string[];
}

export class LogToFixPipeline {
  private static instance: LogToFixPipeline;
  private guard: ForgeGuardType = ForgeGuard.init('log-to-fix');

  private constructor() {}

  public static getInstance(): LogToFixPipeline {
    if (!LogToFixPipeline.instance) {
      LogToFixPipeline.instance = new LogToFixPipeline();
    }
    return LogToFixPipeline.instance;
  }

  /**
   * Analyzes a log string (e.g., build error) and extracts relevant context for the AI.
   */
  public async analyzeLog(log: string): Promise<LogAnalysis> {
    return await this.guard.protect(async () => {
      // 1. Extract file paths from stack traces or error messages
      const fileRegex = /(?:^|\s)([\w\/\.-]+\.(?:ts|tsx|js|jsx|css|json|html))(?::(\d+))?/g;
      const matches = Array.from(log.matchAll(fileRegex));
      const relevantFiles = Array.from(new Set(matches.map(m => m[1])));

      // 2. Use ProjectContextEngine to get snippets for these files
      const contextEngine = ProjectContextEngine.getInstance();
      const context = await Promise.all(relevantFiles.slice(0, 3).map(async (file) => {
        const results = await contextEngine.getRelevantContext(file, 1);
        return results[0];
      }));

      // 3. Construct a structured analysis prompt (this would be sent to Gemini)
      // For now, we return the metadata that the AI tool will use.
      return {
        rootCause: this.inferRootCause(log),
        suggestedFix: 'Pending AI analysis...',
        relevantFiles: context.filter(c => c !== undefined).map(c => c!.path)
      };
    }, { logLength: log.length });
  }

  private inferRootCause(log: string): string {
    if (log.includes('Cannot find module')) return 'Missing dependency';
    if (log.includes('is not a function')) return 'Type mismatch or undefined reference';
    if (log.includes('SyntaxError')) return 'Syntax error';
    if (log.includes('ReferenceError')) return 'Undefined variable';
    return 'Unknown runtime or build error';
  }
}

export const logToFix = LogToFixPipeline.getInstance();
