// ForgeGuard Patch Engine v2.0.0 - AI Enhanced
import { ScanIssue } from './scanner';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface PatchSuggestion {
  file: string;
  line: number;
  issue: ScanIssue;
  fix: string;
  confidence: number;
}

export class PatchEngine {
  private ai: GoogleGenerativeAI | null = null;

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
  }

  async generatePatches(issues: ScanIssue[]): Promise<PatchSuggestion[]> {
    const suggestions: PatchSuggestion[] = [];
    for (const i of issues) {
      suggestions.push({
        file: i.file,
        line: i.line,
        issue: i,
        fix: await this.getFix(i),
        confidence: this.confidence(i.severity)
      });
    }
    return suggestions;
  }

  private async getFix(i: ScanIssue): Promise<string> {
    // Use AI if available
    if (this.ai) {
      try {
        const model = this.ai.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const prompt = `You are an expert security engineer. Fix the following vulnerability in TypeScript.
Vulnerability: ${i.message}
Code snippet to replace:
\`\`\`typescript
${i.snippet}
\`\`\`
Return ONLY the replacement code snippet. Do not include markdown formatting like \`\`\`typescript, just the raw code. Do not include explanations.`;
        
        const result = await model.generateContent(prompt);
        let fix = result.response.text().trim();
        // Clean up markdown if AI included it anyway
        if (fix.startsWith('\`\`\`')) {
          fix = fix.replace(/^\`\`\`[a-z]*\n/, '').replace(/\n\`\`\`$/, '');
        }
        return fix;
      } catch (err) {
        console.error('[PatchEngine] AI generation failed, falling back to static rules:', err);
      }
    }

    // Fallback static rules
    return {
      'eval() RCE risk': 'safeEval(input)',
      'SQL injection via string concat': 'db.query(sql, [params])',
      'Hardcoded secret': 'process.env.SECRET_KEY',
      'Unsafe JSON.parse()': 'JSON.parse(input, (k,v) => validator(v) ? v : undefined)',
      'React dangerouslySetInnerHTML': 'dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(input) }}',
      'Command Injection via dynamic exec': 'spawn(command, args)'
    }[i.message] || i.snippet;
  }

  private confidence(severity: string): number {
    return {critical: 0.9, high: 0.85, medium: 0.7, low: 0.5}[severity] || 0.1;
  }
}
