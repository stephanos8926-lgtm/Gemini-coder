import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { ForgeGuard } from '../guard/ForgeGuard';

export interface ShadowResult {
  success: boolean;
  output: string;
  error?: string;
}

export class ShadowExecutionEngine {
  private static instance: ShadowExecutionEngine;
  private guard: ForgeGuard;

  private constructor(persistence: any) {
    this.guard = ForgeGuard.init('shadow-execution', {}, persistence);
  }

  public static getInstance(persistence: any): ShadowExecutionEngine {
    if (!ShadowExecutionEngine.instance) {
      ShadowExecutionEngine.instance = new ShadowExecutionEngine(persistence);
    }
    return ShadowExecutionEngine.instance;
  }

  /**
   * Executes a proposed fix in a temporary environment to verify it doesn't break tests.
   */
  public async verifyFix(filePath: string, originalContent: string, proposedContent: string, testCommand: string = 'npm test'): Promise<ShadowResult> {
    return await this.guard.protect(async () => {
      const root = process.cwd();
      
      try {
        // 1. Write the proposed fix to the actual file (temporarily)
        await fs.writeFile(path.join(root, filePath), proposedContent);
        
        // 2. Run the test command
        const result = await this.runCommand(testCommand, root);
        
        // 3. Restore original content
        await fs.writeFile(path.join(root, filePath), originalContent);
        
        return result;
      } catch (error) {
        // Ensure restoration even on crash
        await fs.writeFile(path.join(root, filePath), originalContent);
        return {
          success: false,
          output: '',
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }, { filePath, testCommand });
  }

  private runCommand(command: string, cwd: string): Promise<ShadowResult> {
    return new Promise((resolve) => {
      const [cmd, ...args] = command.split(' ');
      const child = spawn(cmd, args, { cwd, shell: true });
      
      let output = '';
      child.stdout.on('data', (data) => output += data.toString());
      child.stderr.on('data', (data) => output += data.toString());
      
      child.on('close', (code) => {
        resolve({
          success: code === 0,
          output: output.trim()
        });
      });

      child.on('error', (err) => {
        resolve({
          success: false,
          output: output.trim(),
          error: err.message
        });
      });
    });
  }

  /**
   * Automated Regression Testing: Runs all tests in the project to ensure no regressions.
   */
  public async runRegressionSuite(): Promise<ShadowResult> {
    return await this.guard.protect(async () => {
      console.log('[ShadowExecution] Running Automated Regression Suite...');
      return await this.runCommand('npm test', process.cwd());
    }, { suite: 'regression' });
  }
}

export const shadowExecution = ShadowExecutionEngine.getInstance(null as any); // FIXME: Provide PersistenceManager instance
