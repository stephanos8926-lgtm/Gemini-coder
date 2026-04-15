import { spawn } from 'child_process';
import { ForgeGuard } from '../utils/ForgeGuard';

export interface TestResult {
  success: boolean;
  stdout: string;
  stderr: string;
  duration: number;
}

export class TestRunner {
  private guard = ForgeGuard.init('test-runner');

  /**
   * Runs tests for a specific workspace.
   * Supports vitest and npm test.
   */
  public async runTests(workspaceRoot: string, testFile?: string): Promise<TestResult> {
    const start = Date.now();
    
    return await this.guard.protect(async () => {
      const command = testFile ? `npx vitest run ${testFile}` : 'npm test';
      const [cmd, ...args] = command.split(' ');
      
      return new Promise((resolve) => {
        const child = spawn(cmd, args, { cwd: workspaceRoot, shell: true });
        let stdout = '';
        let stderr = '';

        child.stdout?.on('data', (data) => stdout += data.toString());
        child.stderr?.on('data', (data) => stderr += data.toString());

        child.on('close', (code) => {
          resolve({
            success: code === 0,
            stdout,
            stderr,
            duration: Date.now() - start
          });
        });

        child.on('error', (err) => {
          resolve({
            success: false,
            stdout,
            stderr: `${stderr}\nError: ${err.message}`,
            duration: Date.now() - start
          });
        });
      });
    }, { workspaceRoot, testFile });
  }
}

export const testRunner = new TestRunner();
