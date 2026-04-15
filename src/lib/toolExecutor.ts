import fs from 'fs/promises';
import { spawn } from 'child_process';
import { diff_match_patch } from 'diff-match-patch';
import { LogTool } from '../utils/LogTool';
import { ForgeGuard } from '../utils/ForgeGuard';
import { scanFile } from '../security/scanner';
import { verifiedPatchEngine } from './verifiedPatchEngine';
import { gitIntelligence } from './gitIntelligence';
import { ProjectContextEngine } from '../utils/ProjectContextEngine';

const logger = new LogTool('toolExecutor');
const guard = ForgeGuard.init('toolExecutor');
const dmp = new diff_match_patch();

type ToolHandler = (args: any, context?: any) => Promise<any>;

const handlers: Map<string, ToolHandler> = new Map<string, ToolHandler>([
  ['read_file', handleReadFile],
  ['write_file', handleWriteFile],
  ['apply_diff', handleApplyDiff],
  ['search_code', handleSearchCode],
  ['find_symbol', handleFindSymbol],
  ['get_diagnostics', handleGetDiagnostics],
  ['runCommand', handleRunCommand],
  ['forgeguard_scan', handleForgeGuardScan],
  ['forgeguard_patch', handleForgeGuardPatch],
  ['git_intel', handleGitIntel],
  ['context_prune', handleContextPrune],
]);

export async function executeTool(name: string, args: any, context: any) {
  logger.info('Executing tool', { name, args });
  const handler = handlers.get(name);
  if (!handler) {
    logger.error('Tool not implemented', undefined, { name });
    return { error: `Tool ${name} not implemented` };
  }
  try {
    return await handler(args, context);
  } catch (error) {
    logger.error('Tool execution failed', error instanceof Error ? error : new Error(String(error)), { name });
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

async function handleReadFile(args: { path: string }) {
  const content = await fs.readFile(args.path, 'utf-8');
  return { content };
}

async function handleWriteFile(args: { path: string, content: string }) {
  await fs.writeFile(args.path, args.content, 'utf-8');
  return { result: 'File written successfully' };
}

async function handleApplyDiff(args: { path: string, diff: string }) {
  const original = await fs.readFile(args.path, 'utf-8');
  const patches = dmp.patch_fromText(args.diff);
  const [patched, results] = dmp.patch_apply(patches, original);
  if (!results.every(r => r)) throw new Error('Failed to apply some patches');
  await fs.writeFile(args.path, patched, 'utf-8');
  return { result: 'Diff applied successfully' };
}

async function handleSearchCode(args: { pattern: string, dir?: string }) {
  const dir = args.dir || '.';
  const result = await runCommandArray('grep', ['-rI', args.pattern, dir]);
  return { results: result.stdout };
}

async function handleFindSymbol(args: { symbol: string, file_pattern?: string }) {
  const cmdArgs = ['-rn', args.symbol];
  if (args.file_pattern) {
    cmdArgs.push(`--include=${args.file_pattern}`);
  }
  cmdArgs.push('.');
  const result = await runCommandArray('grep', cmdArgs);
  return { results: result.stdout };
}

async function handleGetDiagnostics(args: { file_path: string }) {
  const result = await runCommandArray('npx', ['tsc', '--noEmit', args.file_path]);
  return { diagnostics: result.stdout + result.stderr };
}

async function handleRunCommand(args: { command: string }) {
  return await runCommand(args.command);
}

async function handleForgeGuardScan(args: { path: string, isBackend?: boolean }) {
  const issues = scanFile(args.path, args.isBackend ?? true);
  return { issues };
}

async function handleForgeGuardPatch(args: { workspaceRoot: string, issues: any[] }) {
  const results = await verifiedPatchEngine.applyAndVerify(args.workspaceRoot, args.issues);
  return { results };
}

async function handleGitIntel(args: { url: string, branch?: string }) {
  const index = await gitIntelligence.indexRemoteRepo(args.url, args.branch);
  return { index };
}

async function handleContextPrune(args: { query: string, limit?: number }) {
  const context = await ProjectContextEngine.getInstance().getRelevantContext(args.query, args.limit);
  return { context };
}

interface CommandResult {
  stdout: string;
  stderr: string;
  code: number | null;
}

async function runCommand(command: string): Promise<CommandResult> {
  return new Promise((resolve) => {
    const child = spawn(command, { shell: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (data) => stdout += data);
    child.stderr.on('data', (data) => stderr += data);
    child.on('close', (code) => {
      resolve({ stdout, stderr, code });
    });
  });
}

async function runCommandArray(command: string, args: string[]): Promise<CommandResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (data) => stdout += data);
    child.stderr.on('data', (data) => stderr += data);
    child.on('close', (code) => {
      resolve({ stdout, stderr, code });
    });
  });
}
