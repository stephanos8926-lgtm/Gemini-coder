import { GoogleGenerativeAI } from '@google/generative-ai';
import { ShadowExecutionEngine } from './ShadowExecutionEngine';
import { SymbolGraph } from '../../../src/lib/symbolGraph';
import { ForgeGuard } from '../guard/ForgeGuard';

export interface PatchReview {
  score: number;
  reasoning: string;
  risks: string[];
  suggestedSafetyMeasures: string[];
}

/**
 * @class PatchReviewer
 * @description Sub-agent logic for scoring and peer-reviewing automated patches.
 */
export class PatchReviewer {
  private genAI: GoogleGenerativeAI;
  private shadow: ShadowExecutionEngine;

  constructor(apiKey: string, persistence: any) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.shadow = ShadowExecutionEngine.getInstance(persistence);
  }

  /**
   * Reviews a patch by analyzing codebase impact using SymbolGraph and ShadowExecution.
   */
  public async reviewPatch(
    filePath: string, 
    originalCode: string, 
    patchedCode: string,
    symbolGraph: SymbolGraph
  ): Promise<PatchReview> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    
    // 1. Run Shadow Verification (TDD logic)
    const shadowResult = await this.shadow.verifyFix(filePath, originalCode, patchedCode);
    
    // 2. Extract context via SymbolGraph
    const symbols = symbolGraph.getSymbolsInFile(filePath);
    const dependents = symbolGraph.getDependents(filePath);

    // 3. Prompt Sub-agent for Peer Review
    const prompt = `
      You are an expert Code Security Reviewer. Evaluate the following patch.
      
      File: ${filePath}
      Symbols Affected: ${symbols.join(', ')}
      Dependent Files: ${dependents.join(', ')}
      
      Shadow Execution Result: ${shadowResult.success ? 'PASS' : 'FAIL'}
      Output: ${shadowResult.output}

      Original Code:
      \`\`\`ts
      ${originalCode}
      \`\`\`

      Patched Code:
      \`\`\`ts
      ${patchedCode}
      \`\`\`

      Return a JSON result with:
      - score: 0-100 (where 100 is perfectly safe)
      - reasoning: clinical explanation
      - risks: list of potential side effects
      - suggestedSafetyMeasures: list of things to check
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Naive parse for now
    try {
      const jsonStr = text.match(/\{[\s\S]*\}/)?.[0] || '{}';
      return JSON.parse(jsonStr);
    } catch (e) {
      return {
        score: shadowResult.success ? 70 : 30,
        reasoning: "AI response parsing failed. Falling back to shadow execution result.",
        risks: ["Metadata parsing failure"],
        suggestedSafetyMeasures: ["Manual verification required"]
      };
    }
  }
}
