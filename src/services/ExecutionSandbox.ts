import { spawn } from 'child_process';
import { LogTool } from '../../packages/nexus/telemetry/LogTool';
import { ForgeGuard } from '../../packages/nexus/guard/ForgeGuard';

const logger = new LogTool('ExecutionSandbox');
const guard = ForgeGuard.init('ExecutionSandbox');

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode?: number | null;
  timedOut: boolean;
  error?: string;
}

const BLOCKED_PATTERNS = [
  /rm\s+-rf/,
  /curl|wget|nc/,
  /eval|exec/,
  /import\s+os|subprocess/,
  /require.*child_process/
];

export function validateCode(code: string): { valid: boolean; reason?: string } {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(code)) {
      return { valid: false, reason: `Blocked protocol detected: "${pattern}"` };
    }
  }
  return { valid: true };
}

export async function sandboxExecute(
  code: string, 
  language: string, 
  limits: { timeout: number; maxBuffer: number }
): Promise<ExecutionResult> {
  return guard.protect(async () => {
    
    const commands: Record<string, [string, string[]]> = {
      'python': ['python3', ['-c', code]],
      'javascript': ['node', ['-e', code]],
      'bash': ['bash', ['-c', code]]
    };
    
    if (!commands[language]) {
      return { 
        stdout: '', 
        stderr: '', 
        error: `Language "${language}" not supported for live execution.`,
        timedOut: false 
      };
    }
    
    const [cmd, args] = commands[language];
    
    return new Promise((resolve) => {
      logger.info(`Spawning sandbox for ${language}`);
      
      const proc = spawn(cmd, args, {
        timeout: limits.timeout,
        env: { 
          ...process.env,
          HOME: '/tmp',
          PATH: process.env.PATH,
          NO_PROXY: '*'
        }
      });
      
      let stdout = '', stderr = '';
      
      proc.stdout.on('data', (data) => {
        if (stdout.length < limits.maxBuffer) stdout += data.toString();
      });
      
      proc.stderr.on('data', (data) => {
        if (stderr.length < limits.maxBuffer) stderr += data.toString();
      });
      
      proc.on('close', (code) => {
        resolve({
          stdout: stdout.slice(0, limits.maxBuffer),
          stderr: stderr.slice(0, limits.maxBuffer),
          exitCode: code,
          timedOut: false
        });
      });
      
      proc.on('error', (err: any) => {
        resolve({
          stdout: '',
          stderr: '',
          error: err.message,
          timedOut: err.killed || false
        });
      });
    
      // Handle timeout if killed by options.timeout
      setTimeout(() => {
          if (!proc.killed) {
              proc.kill();
              resolve({
                  stdout,
                  stderr,
                  timedOut: true,
                  error: 'Execution timed out'
              });
          }
      }, limits.timeout + 100);
    });
  }, { method: 'sandboxExecute', language });
}
