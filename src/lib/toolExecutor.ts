import fs from 'fs/promises';
import { spawn } from 'child_process';
import path from 'path';
import { diff_match_patch } from 'diff-match-patch';
import { LogTool } from '../utils/LogTool';
import { ForgeGuard } from '../../packages/nexus/guard/ForgeGuard';
import { scanFile } from '../security/scanner';
import { verifiedPatchEngine } from './verifiedPatchEngine';
import { gitIntelligence } from './gitIntelligence';
import { ProjectContextEngine } from '../utils/ProjectContextEngine';
import { shadowExecution } from '../../packages/nexus/utils/ShadowExecutionEngine';
import { logToFix } from './logToFix';

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
  ['shadow_verify', handleShadowVerify],
  ['shadow_regression', handleShadowRegression],
  ['log_analyze', handleLogAnalyze],
  ['web_search', handleWebSearch],
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
  // toolExecutor needs WORKSPACE_ROOT context.
  // Assuming relative path from current user's workspace
  const workspaceRoot = process.env.WORKSPACE_ROOT || path.join(process.cwd(), 'workspaces');
  const { getSafePath } = await import('../utils/pathUtility');
  const safePath = getSafePath(args.path, { role: 'user' }, workspaceRoot, ''); // Needs user context
  const content = await fs.readFile(safePath, 'utf-8');
  return { content };
}

async function handleWriteFile(args: { path: string, content: string }) {
  const workspaceRoot = process.env.WORKSPACE_ROOT || path.join(process.cwd(), 'workspaces');
  const { getSafePath } = await import('../utils/pathUtility');
  const safePath = getSafePath(args.path, { role: 'user' }, workspaceRoot, '');
  await fs.writeFile(safePath, args.content, 'utf-8');
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
  const [tool, ...commandArgs] = args.command.split(' ');
  const { allowedTools } = await import('../constants/allowedTools');

  if (!allowedTools.includes(tool)) {
    throw new Error(`Tool '${tool}' is not allowed for security reasons.`);
  }

  const { spawnAsync } = await import('../utils/spawnUtility');
  try {
    const result = await spawnAsync(tool, commandArgs);
    return { stdout: result.stdout, stderr: result.stderr, code: 0 };
  } catch (e: any) {
    return { stdout: '', stderr: e.message, code: 1 };
  }
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

async function handleShadowVerify(args: { filePath: string, originalContent: string, proposedContent: string, testCommand?: string }) {
  const result = await shadowExecution.verifyFix(args.filePath, args.originalContent, args.proposedContent, args.testCommand);
  return result;
}

async function handleShadowRegression() {
  const result = await shadowExecution.runRegressionSuite();
  return result;
}

async function handleLogAnalyze(args: { log: string }) {
  const analysis = await logToFix.analyzeLog(args.log);
  return analysis;
}

async function handleWebSearch(args: { query: string }) {
  // In a real scenario, this would use a search API or MCP tool
  logger.info('Performing web search', { query: args.query });
  // Placeholder for now, as we don't have a direct search API integrated yet
  return { results: `Search results for "${args.query}" (Placeholder)` };
}

interface CommandResult {
  stdout: string;
  stderr: string;
  code: number | null;
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
