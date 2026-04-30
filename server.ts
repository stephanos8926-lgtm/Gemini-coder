import 'dotenv/config';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn, ChildProcess, exec } from 'child_process';
import util from 'util';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import crypto from 'crypto';
import git from 'isomorphic-git';
import { v4 as uuidv4 } from 'uuid';
import { Server } from 'socket.io';
import http from 'http';
import https from 'https';
import { HttpClient } from 'isomorphic-git';
import { LogTool } from './packages/nexus/telemetry/LogTool';
import { ForgeGuard } from './packages/nexus/guard/ForgeGuard';
import { db, auth } from './src/lib/firebaseAdmin.js';
import { authenticateUser, authorizeAdmin } from './server/middleware/auth.js';
import { FileController } from './server/controllers/FileController.js';
import { McpController } from './server/controllers/McpController.js';
import { getSafePath, WORKSPACE_ROOT, validateFilePath } from './src/utils/pathUtility';
import { FileCacheManager } from './src/utils/FileCacheManager';
import { BackgroundTaskManager } from './src/lib/backgroundTaskManager';
import { ProjectContextEngine } from './src/utils/ProjectContextEngine';
import { ServerWatcher } from './src/lib/serverWatcher';
import { logRedirector } from './src/utils/LogRedirector';
import { SymbolGraph } from './src/lib/symbolGraph';
import { liveDebugger } from './src/lib/liveDebugger';
import { deepProfiler } from './src/lib/deepProfiler';
import { shadowExecution } from './packages/nexus/utils/ShadowExecutionEngine';
import { scanFile } from './src/security/scanner';
import { TUISensor } from './packages/nexus/guard/sensors/TUISensor';
import { NexusFactory } from './packages/nexus/NexusFactory';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { executeTool } from './src/lib/toolExecutor';
import { summarizeChatHistory } from './src/lib/summarizer';
import { safeJsonParse } from './src/lib/utils';
import { SkillExecutor } from './src/lib/SkillExecutor';
import adminRouter from './src/admin/AdminRouter';
import { routeTask, initBackgroundWorker } from './src/services/TaskRouter';
import { coordinateSwarm } from './src/services/SwarmRouter';
import { sandboxExecute, validateCode } from './src/services/ExecutionSandbox';
import { workspaceController } from './server/controllers/workspaceController';
import { ChatController } from './server/controllers/ChatController';
import { GitController } from './server/controllers/GitController';
import { ContextController } from './server/controllers/ContextController';

const fileCache = FileCacheManager.getInstance();
const buildProcesses: Map<string, ChildProcess> = new Map();

export interface AuthenticatedRequest extends Request {
  user?: any;
}
const FIVE_MINUTES_MS = 300000;
const ONE_MINUTE_MS = 60000;
// Global Constants
const DEFAULT_EXIT_TIMEOUT_MS = 1000;
const MCP_CACHE_TTL_MS = 60000;
const HTTP_OK = 200;
const HTTP_BAD_REQUEST = 400;
const HTTP_INTERNAL_SERVER_ERROR = 500;
const chatSummaries = new Map<string, { summary: string, lastMessageCount: number }>();
const globalSecurityIssues = new Map<string, any[]>(); // filePath -> ScanIssue[]
const logger = new LogTool('server');



import { nexusPersist } from './src/lib/persistence/NexusPersistence';
import { FilePersistenceAdapter } from './server_persistence/adapters/FilePersistenceAdapter';

// --- Event Horizon Pipeline & Platform Orchestration ---
import { bus } from './src/lib/ehp/Bus';
import { orchestrator } from './src/services/OrchestrationLayer';
import { warden } from './src/services/SecurityWarden';
import { EHPMessageType, PrincipalType } from './src/lib/ehp/types';

// Initialize EHP components
const ehpBus = bus;
const ehpOrchestrator = orchestrator;
const ehpWarden = warden;
// -------------------------------------------------------

// Initialize Guard via Factory
const nexusFactory = NexusFactory.getInstance();
nexusPersist.setLocalAdapter(new FilePersistenceAdapter());
const persistenceManager = nexusFactory.getPersistenceManager();
const guard = nexusFactory.createForgeGuard('server', persistenceManager);
nexusFactory.setupStandardSensors(guard);

// Global Process Error Handlers
process.on('uncaughtException', (error) => {
  guard.emitSignal({
    type: 'error',
    payload: { message: error.message, stack: error.stack },
    source: 'process_uncaught_exception',
    priority: 'CRITICAL'
  });
  logger.error('FATAL UNCAUGHT EXCEPTION', error);
  // Give Winston/ForgeGuard a moment to flush before exiting
  setTimeout(() => process.exit(1), DEFAULT_EXIT_TIMEOUT_MS);
});

process.on('unhandledRejection', (reason, promise) => {
  guard.emitSignal({
    type: 'error',
    payload: reason instanceof Error ? { message: reason.message, stack: reason.stack } : { reason: String(reason) },
    source: 'process_unhandled_rejection'
  });
  logger.error('UNHANDLED PROMISE REJECTION', reason instanceof Error ? reason : new Error(String(reason)));
});

// Create a compatible HTTP client for isomorphic-git
const gitHttpClient: HttpClient = {
  request: async ({ url, method, headers, body, signal }) => {
    const isHttps = url.startsWith('https:');
    const client = isHttps ? https : http;
    
    return new Promise((resolve, reject) => {
      const req = client.request(url, {
        method,
        headers: headers as any,
      }, (res) => {
        const chunks: Uint8Array[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          // Create an async iterator for the body
          const bodyIterator = (async function* () {
            for (const chunk of chunks) {
              yield chunk;
            }
          })();
          
          resolve({
            url: url,
            statusCode: res.statusCode || HTTP_OK,
            statusMessage: res.statusMessage || 'OK',
            headers: res.headers as any,
            body: bodyIterator,
          });
        });
      });
      
      req.on('error', reject);
      if (body) req.write(body);
      req.end();
    });
  }
};
import { fork } from 'child_process';
import chokidar from 'chokidar';
import admin from 'firebase-admin';
import { initializeApp, getApps, getApp, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import AdmZip from 'adm-zip';
import { z } from 'zod';
import { 
  FileSaveSchema, 
  FileCreateSchema, 
  FileDeleteSchema, 
  FileRenameSchema,
  RunToolSchema,
  FindSymbolSchema,
  DiagnosticsSchema,
  GitRequestSchema,
  ChatRequestSchema
} from './src/lib/schemas';
import { env } from './server-config';
// @ts-ignore — no types needed for rate-limit config

// Global Error Handler Middleware
function errorHandler(err: any, req: express.Request, res: express.Response, next: express.NextFunction) {
  guard.emitSignal({
    type: 'error',
    payload: err instanceof Error ? { message: err.message, stack: err.stack } : err,
    source: 'http_error_middleware',
    context: { path: req.path, method: req.method }
  });

  logger.error('Unhandled error', err, { 
    path: req.path,
    method: req.method 
  });

  if (err instanceof z.ZodError) {
    return res.status(HTTP_BAD_REQUEST).json({ 
      error: 'Validation failed', 
      details: err.issues 
    });
  }

  // Generic response to avoid leaking internal details
  res.status((err as any).status || HTTP_INTERNAL_SERVER_ERROR).json({ 
    error: 'Internal Server Error' 
  });
}

// Validation Schemas - Moved to src/lib/schemas.ts
const AdminRequestSchema = z.object({
  secretKey: z.string().min(1),
});

const AdminUserUpdateSchema = AdminRequestSchema.extend({
  uid: z.string().min(1),
  no_sandbox: z.boolean().optional(),
  role: z.enum(['user', 'admin']).optional(),
});

const AdminUserDeleteSchema = AdminRequestSchema.extend({
  uid: z.string().min(1),
});

const GitPullSchema = AdminRequestSchema.extend({
  repoUrl: z.string().url().optional(),
  branch: z.string().default('main'),
  target: z.enum(['root', 'workspaces']).default('workspaces'),
});

// Removed internal initializeFirebase, authenticateUser, authorizeAdmin, getEnabledTools etc



import { toolRegistry } from './src/lib/ToolRegistry';
import { skillRegistry } from './src/lib/SkillRegistry';

// Load skills
skillRegistry.loadSkills(path.join(process.cwd(), 'src/skills/definitions'));

const skillExecutor = new SkillExecutor();

// Register tools
toolRegistry.registerTool({
  name: 'read_file',
  description: 'Read the contents of a file, including its path.',
  parameters: { type: SchemaType.OBJECT, properties: { path: { type: SchemaType.STRING } }, required: ['path'] },
  execute: async (args, context) => await executeTool('read_file', args, context)
});
toolRegistry.registerTool({
  name: 'write_file',
  description: 'Write content to a file.',
  parameters: { type: SchemaType.OBJECT, properties: { path: { type: SchemaType.STRING }, content: { type: SchemaType.STRING } }, required: ['path', 'content'] },
  execute: async (args, context) => await executeTool('write_file', args, context)
});
toolRegistry.registerTool({
  name: 'apply_diff',
  description: 'Apply a unified diff to a file.',
  parameters: { type: SchemaType.OBJECT, properties: { path: { type: SchemaType.STRING }, diff: { type: SchemaType.STRING } }, required: ['path', 'diff'] },
  execute: async (args, context) => await executeTool('apply_diff', args, context)
});
toolRegistry.registerTool({
  name: 'search_code',
  description: 'Search for a regex pattern in the codebase.',
  parameters: { type: SchemaType.OBJECT, properties: { pattern: { type: SchemaType.STRING }, dir: { type: SchemaType.STRING } }, required: ['pattern'] },
  execute: async (args, context) => await executeTool('search_code', args, context)
});
toolRegistry.registerTool({
  name: 'find_symbol',
  description: 'Find the definition and references of a symbol.',
  parameters: { type: SchemaType.OBJECT, properties: { symbol: { type: SchemaType.STRING }, file_pattern: { type: SchemaType.STRING } }, required: ['symbol'] },
  execute: async (args, context) => await executeTool('find_symbol', args, context)
});
toolRegistry.registerTool({
  name: 'get_diagnostics',
  description: 'Get linting or compilation errors for a file.',
  parameters: { type: SchemaType.OBJECT, properties: { file_path: { type: SchemaType.STRING } }, required: ['file_path'] },
  execute: async (args, context) => await executeTool('get_diagnostics', args, context)
});
toolRegistry.registerTool({
  name: 'mcp_dispatch',
  description: 'Execute a tool on an MCP server.',
  parameters: { type: SchemaType.OBJECT, properties: { server_name: { type: SchemaType.STRING }, tool_name: { type: SchemaType.STRING }, args: { type: SchemaType.STRING } }, required: ['server_name', 'tool_name', 'args'] }
  // mcp_dispatch is special, we don't use executeTool directly
});
toolRegistry.registerTool({
  name: 'runCommand',
  description: 'Run a shell command or tool in the workspace.',
  parameters: { type: SchemaType.OBJECT, properties: { command: { type: SchemaType.STRING } }, required: ['command'] },
  execute: async (args, context) => await executeTool('runCommand', args, context)
});
toolRegistry.registerTool({
  name: 'web_search',
  description: 'Search the web for information.',
  parameters: { type: SchemaType.OBJECT, properties: { query: { type: SchemaType.STRING } }, required: ['query'] },
  execute: async (args, context) => await executeTool('web_search', args, context)
});





import { mcpClientPool, getMcpClient } from './server/mcpClient.js';

// Removed local WORKSPACE_ROOT definition as it is now imported from pathUtility
// const WORKSPACE_ROOT = path.join(process.cwd(), 'workspaces');
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const upload = multer({ dest: UPLOAD_DIR });

// Server Initialization Function
async function startServer() {
  initBackgroundWorker();
  logger.info('Initializing express app...');
  const app = express();
  const PORT = 3000;

  // Ensure workspace root exists
  try {
    await fs.mkdir(WORKSPACE_ROOT, { recursive: true });
    logger.info('Workspace root initialized', { WORKSPACE_ROOT });
  } catch (e) {
    logger.error('Failed to create workspace root', e as any);
  }

  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    logger.info('Upload directory initialized', { UPLOAD_DIR });
  } catch (e) {
    logger.error('Failed to create upload directory', e as any);
  }

  // Body parser MUST come before CSRF protection to parse request body
  app.use(express.json({ limit: '5mb' }));

  // CSRF Protection Middleware
  const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }
    const token = req.headers['x-csrf-token'];
    // In a real app, you'd validate this against a session token.
    // For this prototype, we'll check against a simple server-side secret.
    if (!token || token !== env.CSRF_SECRET) {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }
    next();
  };
  app.use(csrfProtection);

  // MCP Tool Registry
  let cachedTools: any[] | null = null;
  let lastConfigRead: number = 0;

  const getEnabledTools = async () => {
    const now = Date.now();
    if (cachedTools && now - lastConfigRead < MCP_CACHE_TTL_MS) { // Cache for 60 seconds
      return cachedTools;
    }
    try {
      const config = JSON.parse(await fs.readFile('./mcp-config.json', 'utf-8'));
      cachedTools = Object.entries(config.tools)
        .filter(([_, tool]: any) => tool.enabled)
        .map(([name, tool]: any) => ({ name, ...tool }));
      lastConfigRead = now;
      return cachedTools;
    } catch (error: any) {
      logger.error('Error reading mcp-config.json:', error);
      return [];
    }
  };

  // Endpoint for GIDE to call tools

  // Endpoint to get all MCP servers and their status
  const mcpLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 30,
    message: { error: 'Too many requests to MCP endpoints' }
  });

  app.get('/api/mcp/servers', mcpLimiter, McpController.listServers);
  app.post('/api/mcp/connect', mcpLimiter, McpController.connectServer);

  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  if (!ADMIN_EMAIL) {
    logger.error('CRITICAL: ADMIN_EMAIL environment variable is not set');
  }



  app.get('/api/admin/mcp/tools', authenticateUser, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // FIXED: 2026-04-10 - Add authentication to admin endpoints
    // These endpoints modify server configuration and should be restricted
    const userLogger = (req as any).logger || logger;
    if (req.user.role !== 'admin') {
      userLogger.warn('Unauthorized access attempt to /api/admin/mcp/tools');
      return res.status(403).json({ error: 'Admin access required' });
    }
    const tools = await getEnabledTools();
    res.json(tools);
  });

  // FIXED: 2026-04-10 - Protect with authentication and rate limiting
  const adminAuthLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 10
  });
  
  app.post('/api/admin/mcp/tools/:name', adminAuthLimiter, authenticateUser, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { name } = req.params;
    const { enabled } = req.body;
    const userLogger = (req as any).logger || logger;
    // FIXED: 2026-04-10 - Verify user is actually an admin
    if (req.user.role !== 'admin') {
      userLogger.warn('Unauthorized admin access attempt to update MCP tool', { tool: name });
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    try {
      const config = JSON.parse(await fs.readFile('./mcp-config.json', 'utf-8'));
      if (config.tools[name]) {
        config.tools[name].enabled = enabled;
        await fs.writeFile('./mcp-config.json', JSON.stringify(config, null, 2));
        userLogger.info(`MCP tool ${name} updated to ${enabled}`);
        res.json({ status: 'updated' });
      } else {
        userLogger.warn(`MCP tool ${name} not found`);
        res.status(404).json({ error: 'Tool not found' });
      }
    } catch (error: any) {
      userLogger.error('Error updating mcp-config.json:', error);
      res.status(500).json({ error: 'Failed to update tool' });
    }
  });

  const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Too many requests, please try again later.' },
  });
  app.use('/api/admin', adminLimiter, authenticateUser, authorizeAdmin, adminRouter);
  
                

  // Endpoint for GIDE to call tools
  app.post('/api/mcp/call', authenticateUser, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await guard.protect(async () => {
        const { serverName, toolName, args } = req.body;
        
        const config = JSON.parse(await fs.readFile('./mcp-config.json', 'utf-8'));
        const serverDef = config.tools[serverName];
        
        if (!serverDef) {
          res.status(404).json({ error: 'Server not found' });
          return;
        }
        
        // Get pooled client
        const client = await getMcpClient(serverName, serverDef, WORKSPACE_ROOT);
        
        // Call tool
        const result = await client.callTool({
          name: toolName,
          arguments: args,
        });
        
        res.json(result);
      }, { requestId: req.headers['x-request-id'] as string, path: '/api/mcp/call' });
    } catch (error: any) {
      logger.error('Error calling MCP tool:', error);
      if (!res.headersSent) res.status(500).json({ error: 'Failed to call tool' });
    }
  });


  app.get('/api/workspaces', authenticateUser, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await guard.protect(async () => {
        await workspaceController.listWorkspaces(req, res, next);
      }, { path: '/api/workspaces' });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/telemetry/stats', authenticateUser, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Only admins should see raw telemetry - use env variable
      if (req.user.role !== 'admin' && req.user.email !== process.env.ADMIN_EMAIL) {
        return res.status(403).json({ error: 'Permission denied' });
      }
      const signals = await persistenceManager.getRecentSignals(100);
      res.json({ signals });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/files', authenticateUser, FileController.getFiles);

  app.post('/api/tools/run', authenticateUser, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await guard.protect(async () => {
        const { command, workspace } = RunToolSchema.parse(req.body);
        logger.info('Running tool', { command, workspace, uid: req.user.uid });

        const isSandboxed = !req.user.no_sandbox;
        const isAdmin = req.user.role === 'admin';

        const root = workspace ? path.join(WORKSPACE_ROOT, workspace) : path.join(WORKSPACE_ROOT, req.user.uid);
        await fs.mkdir(root, { recursive: true });

        const { allowedTools } = await import('./src/constants/allowedTools');
        const [tool, ...args] = command.split(' ');

        if (isAdmin) {
          logger.info('Running admin command', { command });
          // Even admins should be restricted to allowed tools, or we need a very strict audit log
          if (!allowedTools.includes(tool)) {
            logger.warn('Unauthorized admin command attempt', { command });
            res.status(403).json({ error: 'Tool not allowed' });
            return;
          }
          
          const { spawnAsync } = await import('./src/utils/spawnUtility');
          const { stdout, stderr } = await spawnAsync(tool, args, { cwd: root });
          res.json({ stdout, stderr, success: true });
          return;
        }

        if (!allowedTools.includes(tool)) {
          logger.warn('Unauthorized tool access attempt', { tool, command });
          res.status(403).json({ error: `Tool '${tool}' is not allowed for security reasons.` });
          return;
        }

        logger.info('Spawning child process', { tool, args });
        const { spawnAsync } = await import('./src/utils/spawnUtility');
        const { stdout, stderr } = await spawnAsync(tool, args, { cwd: root });
        res.json({ stdout, stderr, success: true });
        
        // FIXED: 2026-04-10 - Process management complete.
      }, { requestId: req.headers['x-request-id'] as string, path: '/api/tools/run' });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/tools/find_symbol', authenticateUser, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await guard.protect(async () => {
        const { symbol, file_pattern, workspace } = FindSymbolSchema.parse(req.body);
        const root = workspace ? path.join(WORKSPACE_ROOT, workspace) : path.join(WORKSPACE_ROOT, req.user.uid);
        
        const execAsync = util.promisify(exec);
        
        // Try rg first, fallback to grep
        const cmd = `rg --json --no-heading --line-number ${file_pattern ? `-g "${file_pattern}"` : ''} "${symbol}" . || grep -rn "${symbol}" ${file_pattern ? `--include="${file_pattern}"` : ''} .`;
        
        try {
          const { stdout } = await execAsync(cmd, { cwd: root, timeout: 10000 });
          const locations = stdout.split('\n').filter(Boolean).slice(0, 50).map(line => {
            try {
              // Try to parse rg JSON output
              const data = JSON.parse(line);
              if (data.type === 'match') {
                return { file: data.data.path.text, line: data.data.line_number, snippet: data.data.lines.text.trim() };
              }
              return null;
            } catch (e) {
              // Fallback to grep parsing
              const [file, lineNum, ...snippet] = line.split(':');
              if (file && lineNum && !isNaN(parseInt(lineNum, 10))) {
                return { file, line: parseInt(lineNum, 10), snippet: snippet.join(':').trim() };
              }
              return null;
            }
          }).filter(Boolean);
          res.json({ locations });
        } catch (e: any) {
          // grep returns exit code 1 if no lines were selected
          if (e.code === 1) return res.json({ locations: [] });
          throw e;
        }
      }, { requestId: req.headers['x-request-id'] as string, path: '/api/tools/find_symbol' });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/tools/diagnostics', authenticateUser, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await guard.protect(async () => {
        const { file_path, workspace } = DiagnosticsSchema.parse(req.body);
        const targetPath = getSafePath(file_path, req.user, workspace);
        const root = workspace ? path.join(WORKSPACE_ROOT, workspace) : path.join(WORKSPACE_ROOT, req.user.uid);
        
        const execAsync = util.promisify(exec);
        
        // Basic syntax check using node for JS/TS
        if (file_path.endsWith('.js') || file_path.endsWith('.ts')) {
          try {
            await execAsync(`node --check ${targetPath}`, { cwd: root, timeout: 5000 });
            res.json({ diagnostics: [] });
          } catch (e: any) {
            res.json({ diagnostics: [{ message: e.stderr || e.message }] });
          }
        } else {
          res.json({ diagnostics: [{ message: "Diagnostics not supported for this file type yet." }] });
        }
      }, { requestId: req.headers['x-request-id'] as string, path: '/api/tools/diagnostics' });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/admin/users', authenticateUser, authorizeAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { secretKey } = AdminRequestSchema.parse(req.body);
      const isValidSecret = crypto.timingSafeEqual(
        Buffer.from(secretKey || ''),
        Buffer.from(env.ADMIN_SECRET_KEY || '')
      );
      if (!isValidSecret) {
        logger.warn('Unauthorized admin users access attempt', { 
          providedKey: secretKey?.substring(0, 3) + '...',
          expectedKeySet: !!env.ADMIN_SECRET_KEY 
        });
        const errorMsg = !env.ADMIN_SECRET_KEY 
          ? 'Admin secret key is not configured on the server.' 
          : 'Invalid admin secret key.';
        return res.status(403).json({ error: errorMsg });
      }
      
      if (!db) {
        logger.error('Firestore not initialized');
        return res.status(500).json({ error: 'Firestore not initialized' });
      }

      logger.info('Fetching users from Firestore');
      const usersSnapshot = await db.collection('users').get();
      const users = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
      logger.info(`Found ${users.length} users`);
      res.json(users);
    } catch (error) {
      logger.error('Failed to fetch users', error as any);
      next(error);
    }
  });

  app.post('/api/admin/users/update', async (req, res, next) => {
    const userLogger = logger; // Admin endpoint, use system logger
    try {
      const { secretKey, uid, no_sandbox, role } = AdminUserUpdateSchema.parse(req.body);
      if (secretKey !== env.ADMIN_SECRET_KEY) {
        userLogger.warn('Unauthorized admin access attempt to update user', { uid });
        return res.status(403).json({ error: 'Unauthorized' });
      }
      
      const updateData: any = {};
      if (no_sandbox !== undefined) updateData.no_sandbox = no_sandbox;
      if (role !== undefined) updateData.role = role;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'No update data provided' });
      }

      await db.collection('users').doc(uid).update(updateData);
      userLogger.info(`User ${uid} updated`, { updateData });
      res.json({ success: true });
    } catch (error) {
      userLogger.error('Error updating user', error as any, { uid: req.body.uid });
      next(error);
    }
  });

  app.post('/api/admin/users/delete', async (req, res, next) => {
    try {
      const { secretKey, uid } = AdminUserDeleteSchema.parse(req.body);
      if (secretKey !== env.ADMIN_SECRET_KEY) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      
      await db.collection('users').doc(uid).delete();
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/git/pull', async (req, res, next) => {
    try {
      const { repoUrl, branch, secretKey, target } = GitPullSchema.parse(req.body);
      if (secretKey !== env.ADMIN_SECRET_KEY) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const dir = target === 'root' ? process.cwd() : WORKSPACE_ROOT;
      let isRepo = false;
      try {
        await fs.stat(path.join(dir, '.git'));
        isRepo = true;
      } catch (e) {
        isRepo = false;
      }

      if (isRepo) {
        await git.pull({
          fs: fsSync,
          http: gitHttpClient,
          dir,
          author: { name: 'AI Studio', email: 'ai@studio.build' },
          singleBranch: true,
          ref: branch,
          remoteRef: branch
        });
      } else if (repoUrl) {
        await git.clone({
          fs: fsSync,
          http: gitHttpClient,
          dir,
          url: repoUrl,
          singleBranch: true,
          ref: branch
        });
      } else {
        return res.status(400).json({ error: 'Repository URL required for initial clone' });
      }
      
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/admin/system-info', async (req, res, next) => {
    try {
      const { secretKey } = AdminRequestSchema.parse(req.body);
      if (secretKey !== env.ADMIN_SECRET_KEY) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      
      // Simple CPU usage estimation
      const startUsage = process.cpuUsage();
      const startTime = Date.now();
      
      // Wait a tiny bit to get a delta
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const endUsage = process.cpuUsage(startUsage);
      const endTime = Date.now();
      
      const totalUsage = (endUsage.user + endUsage.system) / 1000; // ms
      const elapsedTime = endTime - startTime; // ms
      const cpuPercent = Math.min(100, Math.round((totalUsage / elapsedTime) * 100));

      res.json({
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: cpuPercent,
        nodeVersion: process.version,
        platform: process.platform
      });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/admin/workspaces/delete', async (req, res, next) => {
    try {
      const { secretKey, workspace } = z.object({
        secretKey: z.string(),
        workspace: z.string()
      }).parse(req.body);

      if (secretKey !== env.ADMIN_SECRET_KEY) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      
      const workspacePath = path.join(WORKSPACE_ROOT, workspace);
      await fs.rm(workspacePath, { recursive: true, force: true });
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/git', authenticateUser, GitController.handleGit);

  app.post('/api/admin/logs', async (req, res, next) => {
    try {
      const { secretKey } = AdminRequestSchema.parse(req.body);
      if (secretKey !== env.ADMIN_SECRET_KEY) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      // TODO: implement log retrieval (e.g. read from a rotating log file)
      res.status(501).json({ error: 'Log retrieval not yet implemented' });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/admin/readme', async (req, res, next) => {
    try {
      const { secretKey, content } = z.object({
        secretKey: z.string(),
        content: z.string()
      }).parse(req.body);

      if (secretKey !== env.ADMIN_SECRET_KEY) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      
      await fs.writeFile(path.join(process.cwd(), 'README.md'), content, 'utf-8');
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/import-zip', upload.single('zip'), authenticateUser, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { workspace } = req.body;
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      const root = workspace ? path.join(WORKSPACE_ROOT, workspace) : path.join(WORKSPACE_ROOT, req.user.uid);
      await fs.mkdir(root, { recursive: true });

      try {
        const zip = new AdmZip(req.file.path);
        zip.extractAllTo(root, true);
        res.json({ success: true });
      } finally {
        await fs.unlink(req.file.path).catch(() => {});
      }
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/files/content', authenticateUser, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await guard.protect(async () => {
        const filePath = req.query.path as string;
        const workspace = (req.query.workspace as string) || '';
        if (!filePath) {
          res.status(400).json({ error: 'Path required' });
          return;
        }
        
        const fullPath = getSafePath(filePath, req.user, workspace);
        const content = await fileCache.getFile(req.user.uid, filePath, fullPath);
        res.json({ content });
      }, { requestId: req.headers['x-request-id'] as string, path: '/api/files/content' });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/files/save', authenticateUser, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await guard.protect(async () => {
        const { path: filePath, content, workspace } = FileSaveSchema.parse(req.body);
        const fullPath = getSafePath(filePath, req.user, workspace);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fileCache.updateFile(req.user.uid, filePath, fullPath, content);
        res.json({ success: true });
      }, { requestId: req.headers['x-request-id'] as string, path: '/api/files/save' });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/files/staging/accept', authenticateUser, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await guard.protect(async () => {
        const { path: filePath, workspace } = z.object({ path: z.string(), workspace: z.string().default('') }).parse(req.body);
        const stagedPath = path.join(process.cwd(), '.staging', filePath);
        const targetPath = getSafePath(filePath, req.user, workspace);

        if (!fsSync.existsSync(stagedPath)) {
          throw new Error('Staged file not found');
        }

        const content = await fs.readFile(stagedPath, 'utf-8');
        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        await fileCache.updateFile(req.user.uid, filePath, targetPath, content);
        
        // Clean up
        await fs.unlink(stagedPath);
        
        res.json({ success: true });
      }, { requestId: req.headers['x-request-id'] as string, path: '/api/files/staging/accept' });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/files/staging/reject', authenticateUser, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await guard.protect(async () => {
        const { path: filePath } = z.object({ path: z.string() }).parse(req.body);
        const stagedPath = path.join(process.cwd(), '.staging', filePath);

        if (fsSync.existsSync(stagedPath)) {
          await fs.unlink(stagedPath);
        }
        
        res.json({ success: true });
      }, { requestId: req.headers['x-request-id'] as string, path: '/api/files/staging/reject' });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/files/create', authenticateUser, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await guard.protect(async () => {
        const { path: filePath, isDir, workspace } = FileCreateSchema.parse(req.body);
        const fullPath = getSafePath(filePath, req.user, workspace);
        if (isDir) {
          await fs.mkdir(fullPath, { recursive: true });
        } else {
          await fs.mkdir(path.dirname(fullPath), { recursive: true });
          await fileCache.updateFile(req.user.uid, filePath, fullPath, '');
        }
        res.json({ success: true });
      }, { requestId: req.headers['x-request-id'] as string, path: '/api/files/create' });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/files/delete', authenticateUser, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await guard.protect(async () => {
        const { path: filePath, workspace } = FileDeleteSchema.parse(req.body);
        const fullPath = getSafePath(filePath, req.user, workspace);
        const stats = await fs.stat(fullPath);
        if (stats.isDirectory()) {
          await fs.rm(fullPath, { recursive: true, force: true });
        } else {
          await fs.unlink(fullPath);
          fileCache.invalidate(req.user.uid, filePath);
        }
        res.json({ success: true });
      }, { requestId: req.headers['x-request-id'] as string, path: '/api/files/delete' });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/files/rename', authenticateUser, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await guard.protect(async () => {
        const { oldPath, newPath, workspace } = FileRenameSchema.parse(req.body);
        const fullOldPath = getSafePath(oldPath, req.user, workspace);
        const fullNewPath = getSafePath(newPath, req.user, workspace);
        await fs.mkdir(path.dirname(fullNewPath), { recursive: true });
        await fs.rename(fullOldPath, fullNewPath);
        fileCache.invalidate(req.user.uid, oldPath);
        // We don't eagerly cache the new path, it will be cached on next read
        res.json({ success: true });
      }, { requestId: req.headers['x-request-id'] as string, path: '/api/files/rename' });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/search', authenticateUser, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await guard.protect(async () => {
        const { query, workspace = '' } = req.query;

        if (!query) {
          res.status(400).json({ error: 'Query required' });
          return;
        }

        const root = getSafePath('', req.user, workspace as string);

        // SECURITY: Add timeout and limit to prevent ReDoS
        const grepArgs = [
          '-rnIE',
          '--exclude-dir=node_modules',
          '--exclude-dir=.git',
          '--exclude-dir=dist',
          '--exclude-dir=.next',
          '--exclude-dir=.staging',
          '--max-count=100', // Limit results
          query as string,
          root
        ];

        await new Promise<void>((resolve, reject) => {
          // Use timeout to kill long-running grep processes
          const child = spawn('grep', grepArgs, { timeout: 5000 });
          let stdout = '';
          let stderr = '';
          child.stdout.on('data', (d) => { stdout += d; });
          child.stderr.on('data', (d) => { stderr += d; });
          child.on('close', (code) => {
            if (code === 0 || code === 1) {
              // code 1 = no matches (not an error)
              const results = stdout.split('\n').filter(Boolean).map(line => {
                const [fullPath, lineNum, ...contentParts] = line.split(':');
                const relativePath = path.relative(root, fullPath);
                return {
                  path: relativePath,
                  line: parseInt(lineNum),
                  content: contentParts.join(':').trim()
                };
              });
              res.json(results);
              resolve();
            } else if (code === null) {
              reject(new Error('Grep process timed out'));
            } else {
              reject(new Error(stderr || `grep exited with code ${code}`));
            }
          });
          child.on('error', reject);
        });
      }, { requestId: req.headers['x-request-id'] as string, path: '/api/search' });
    } catch (error) {
      next(error);
    }
  });

  // SECURITY: Chat endpoint REQUIRES authentication
  // Without this, anyone can access the endpoint and potentially leak/abuse API keys
  app.post('/api/chat', authenticateUser, ChatController.handleChat);


  app.get('/api/security/audit', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const workspace = (req.query.workspace as string) || req.user.uid;
      
      // Fix 3.1: Ensure workspace variable is validated against the authenticated UID
      // If user is not admin, they can only view their own uid-based workspace or workspaces starting with their uid
      const isAuthorized = req.user.role === 'admin' || workspace === req.user.uid || workspace.startsWith(`${req.user.uid}/`);
      
      if (!isAuthorized) {
        logger.warn('Unauthorized security audit access attempt', { uid: req.user.uid, requestedWorkspace: workspace });
        return res.status(403).json({ error: 'Unauthorized workspace audit access' });
      }

      const tenantPrefix = `${workspace}:`;

      // Filter global issues map by tenant prefix - Ensure exact tenant match using colon delimiter
      const allIssues = Array.from(globalSecurityIssues.entries())
        .filter(([key]) => key.startsWith(tenantPrefix))
        .flatMap(([key, issues]) => {
          const filePath = key.replace(tenantPrefix, '');
          return issues.map(i => ({ ...i, path: filePath, id: crypto.randomUUID() }));
        });
      
      res.json({
        issues: allIssues,
        stats: {
          high: allIssues.filter(i => i.severity === 'high' || i.severity === 'critical').length,
          medium: allIssues.filter(i => i.severity === 'medium').length,
          low: allIssues.filter(i => i.severity === 'low' || i.severity === 'info').length,
          lastScan: new Date().toISOString()
        }
      });
    } catch (e) {
      logger.error('Failed to fetch security audit', e instanceof Error ? e : new Error(String(e)));
      res.status(500).json({ error: 'Failed to fetch security audit' });
    }
  });

  app.get('/api/context/stats', authenticateUser, ContextController.getStats);

  // Task & Swarm Endpoints
  const TaskSubmitSchema = z.object({
    prompt: z.string().min(1),
    files: z.record(z.string(), z.string()).optional().default({}),
    projectId: z.string().optional().default('default'),
    forceBackground: z.boolean().optional().default(false)
  });

  app.post('/api/tasks/submit', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { prompt, files, projectId, forceBackground } = TaskSubmitSchema.parse(req.body);
      const userId = req.user.uid;
      
      const result = await routeTask(userId, projectId, prompt, files as Record<string, string>, { forceBackground });
      res.json(result);
    } catch (e) {
      logger.error('Task submission failed', e as any);
      res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  app.post('/api/swarms/coordinate', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { prompt, projectId } = req.body;
      const userId = req.user.uid;
      
      const result = await coordinateSwarm(userId, projectId || 'default', prompt);
      res.json(result);
    } catch (e) {
      logger.error('Swarm coordination failed', e as any);
      res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  app.post('/api/execute', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { code, language } = req.body;
      
      const validation = validateCode(code);
      if (!validation.valid) {
        return res.status(403).json({ error: validation.reason });
      }

      const result = await sandboxExecute(code, language, {
        timeout: 10000, // 10 second limit
        maxBuffer: 1024 * 512 // 512KB output limit
      });
      
      res.json(result);
    } catch (e) {
      logger.error('Code execution failed', e as any);
      res.status(500).json({ error: 'Evaluation engine error' });
    }
  });


  app.post('/api/build/stop', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.body;
    const child = buildProcesses.get(id);
    if (child) {
      child.kill();
      buildProcesses.delete(id);
      res.json({ status: 'stopped' });
    } else {
      res.status(404).json({ error: 'Process not found' });
    }
  });

  // Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    app.get('/admin', authenticateUser, authorizeAdmin, (req, res) => {
      res.sendFile(path.join(process.cwd(), 'admin.html'));
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('/admin', authenticateUser, authorizeAdmin, (req, res) => {
      res.sendFile(path.join(distPath, 'admin.html'));
    });
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: "*", 
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  new ServerWatcher(WORKSPACE_ROOT, io);

  app.post('/api/build/start', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      await guard.protect(async () => {
        const { command, id } = req.body;
        const child = spawn(command, { shell: true });
        buildProcesses.set(id, child);
        
        child.stdout?.on('data', (data) => {
          const output = data.toString();
          io.emit(`build:${id}:stdout`, output);
          logRedirector.push('build', 'info', output);
        });
        
        child.stderr?.on('data', (data) => {
          const output = data.toString();
          io.emit(`build:${id}:stderr`, output);
          logRedirector.push('build', 'error', output);
        });
        
        child.on('close', (code) => {
          buildProcesses.delete(id);
          io.emit(`build:${id}:close`, code);
          logRedirector.push('build', code === 0 ? 'info' : 'error', `Build process ${id} exited with code ${code}`);
        });
        
        res.json({ status: 'started' });
      }, { requestId: req.headers['x-request-id'] as string, path: '/api/build/start' });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Project Context Engine Endpoints
  app.post('/api/context/index', authenticateUser, ContextController.indexWorkspace);

  app.get('/api/context/search', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
    const { q } = req.query;
    if (typeof q !== 'string') return res.status(400).json({ error: 'Query required' });
    
    const results = ProjectContextEngine.getInstance().search(q);
    res.json({ results });
  });

  app.post('/api/context/relevant', authenticateUser, ContextController.getRelevant);

  app.get('/api/context/index', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
    const index = ProjectContextEngine.getInstance().getIndex();
    res.json({ index });
  });

  app.get('/api/tasks', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
    const workspace = (req.query.workspace as string) || req.user.uid;
    const tenant = { userId: req.user.uid, workspaceId: workspace };
    const tasks = BackgroundTaskManager.getInstance(tenant).getTasks();
    res.json({ tasks });
  });

  app.post('/api/tasks', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    const workspace = (req.body.workspace as string) || req.user.uid;
    const { name } = req.body;
    const tenant = { userId: req.user.uid, workspaceId: workspace };
    const taskManager = BackgroundTaskManager.getInstance(tenant);
    
    const task = taskManager.createTask(name || 'Agentic Task');
    
    // Simulate long-running agent logic in the background
    taskManager.executeTask(task.id, async (signal, log, progress) => {
      log('Initializing agent swarm...');
      progress(10);
      
      const numSteps = 5;
      for (let i = 1; i <= numSteps; i++) {
        if (signal.aborted) {
          log('Agent interrupted by user.');
          return;
        }
        await new Promise(r => setTimeout(r, 2000));
        log(`Executing step ${i} of ${numSteps}: Synthesizing plan...`);
        progress(10 + (80 / numSteps) * i);
      }
      
      log('Agent Swarm task completed successfully.');
      progress(100);
    });

    res.json({ task });
  });

  app.post('/api/tasks/:id/cancel', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
    const workspace = (req.body.workspace as string) || req.user.uid;
    const tenant = { userId: req.user.uid, workspaceId: workspace };
    const taskManager = BackgroundTaskManager.getInstance(tenant);
    
    taskManager.cancelTask(req.params.id);
    res.json({ success: true });
  });

  app.get('/api/context/docs', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
    const workspace = (req.query.workspace as string) || req.user.uid;
    const tenant = { userId: req.user.uid, workspaceId: workspace };
    const docs = ProjectContextEngine.getInstance(tenant).getDocs();
    res.json({ docs });
  });

  app.get('/api/context/graph', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
    const workspace = (req.query.workspace as string) || req.user.uid;
    const tenant = { userId: req.user.uid, workspaceId: workspace };
    res.json({ summary: SymbolGraph.getInstance(tenant).getGraphSummary() });
  });

  app.post('/api/embeddings', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { text } = req.body;
      const apiKey = req.body.apiKey || process.env.GEMINI_API_KEY;
      
      if (!text) return res.status(400).json({ error: 'Text required' });
      if (!apiKey) return res.status(400).json({ error: 'API Key required' });

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
      const result = await model.embedContent(text);
      
      res.json({ embedding: result.embedding.values });
    } catch (error) {
      logger.error('Embedding failed', error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({ error: String(error) });
    }
  });

  // Log Redirector Endpoints
  app.get('/api/logs', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
    const { source } = req.query;
    const logs = logRedirector.getLogs(source as any);
    res.json({ logs });
  });

  app.post('/api/logs/clear', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
    logRedirector.clear();
    res.json({ success: true });
  });

  app.post('/api/shadow/verify', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { filePath, originalContent, proposedContent, testCommand } = req.body;
      const result = await shadowExecution.verifyFix(filePath, originalContent, proposedContent, testCommand);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post('/api/telemetry/inject', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { filePath, line, code } = req.body;
      const fullPath = path.join(WORKSPACE_ROOT, filePath);
      
      if (!fsSync.existsSync(fullPath)) {
        return res.status(404).json({ error: 'File not found' });
      }

      const content = await fs.readFile(fullPath, 'utf8');
      const lines = content.split('\n');
      lines.splice(line - 1, 0, `// [GIDE Telemetry] ${code}`);
      
      await fs.writeFile(fullPath, lines.join('\n'));
      res.json({ success: true, message: 'Telemetry injected' });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Debugger & Profiler Endpoints
  app.post('/api/debug/attach', authenticateUser, async (req, res) => {
    await liveDebugger.attach();
    res.json({ status: 'attached' });
  });

  app.post('/api/debug/breakpoint', authenticateUser, async (req, res) => {
    const { file, line, action } = req.body;
    if (action === 'set') {
      await liveDebugger.setBreakpoint(file, line);
    } else {
      await liveDebugger.removeBreakpoint(file, line);
    }
    res.json({ status: 'ok' });
  });

  app.get('/api/debug/profiler/snapshots', authenticateUser, (req, res) => {
    res.json({ snapshots: deepProfiler.getSnapshots() });
  });

  app.post('/api/debug/profiler/start', authenticateUser, (req, res) => {
    deepProfiler.start();
    res.json({ status: 'started' });
  });

  app.post('/api/debug/analyze-heap', authenticateUser, async (req, res) => {
    try {
      const { snapshotPath } = req.body;
      // In a real scenario, this would use a heap analysis tool
      const analysis = await deepProfiler.analyzeHeap(snapshotPath);
      res.json({ analysis });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post('/api/ai/autocomplete', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { code, line, column } = req.body;
      // Low-latency streaming endpoint for ghost text
      const completion = await liveDebugger.getGhostText(code, line, column);
      res.json({ completion });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // File system watcher
  const watcher = chokidar.watch('workspaces', {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true
  });

  watcher.on('all', async (event, filePath) => {
    logger.info(`File system event: ${event} on ${filePath}`);
    
    // Extract tenant from path: workspaces/{userId}/{workspaceName}/...
    const relativePath = path.relative('workspaces', filePath);
    const pathParts = relativePath.split(path.sep);
    const userId = pathParts[0];
    const workspaceId = pathParts.length >= 2 ? `${userId}/${pathParts[1]}` : userId;

    if (!userId) return;

    // Notify only the specific user/workspace room
    io.to(workspaceId).emit('fs-event', { event, path: filePath });

    // Update Symbol Graph on change
    if ((event === 'add' || event === 'change') && (filePath.endsWith('.ts') || filePath.endsWith('.tsx'))) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        SymbolGraph.getInstance({ userId, workspaceId }).updateFile(filePath, content);

        // Proactive Security Scan
        const scanner = fork('./src/scripts/run-audit.ts', [filePath]);
        scanner.on('message', (issues: any[]) => {
            if (Array.isArray(issues)) {
              const securityKey = `${workspaceId}:${filePath}`;
              globalSecurityIssues.set(securityKey, issues);
              io.to(workspaceId).emit('security-alert', { path: filePath, issues });
            }
        });
        scanner.on('close', (code) => {
            if (code !== 0) logger.error(`Scanner failed for ${filePath}`);
        });

      } catch (e) {
        logger.error(`Failed to update symbol graph for ${filePath}`, e instanceof Error ? e : new Error(String(e)));
      }
    }
  });

  // Authentication for Socket.io
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    await guard.emitSignal({ type: 'info', payload: 'Socket connection attempt', context: { hasToken: !!token } });
    
    if (!token) {
        await guard.emitSignal({ type: 'warning', payload: 'Socket connection rejected: No token provided' });
        return next(new Error('Authentication error: Token required'));
    }

    try {
      const decodedToken = await auth.verifyIdToken(token);
      await guard.emitSignal({ type: 'info', payload: 'Socket connection authenticated', context: { uid: decodedToken.uid } });
      (socket as any).user = decodedToken;
      next();
    } catch (err) {
      await guard.emitSignal({ 
          type: 'error', 
          payload: err instanceof Error ? { message: err.message, stack: err.stack } : err, 
          context: { message: 'Socket connection authentication failed' } 
      });
      // Ensure we send a clear error message that we can catch on the client
      next(new Error('Authentication error: ' + (err instanceof Error ? err.message : 'Invalid token')));
    }
  });

  io.on('connection', (socket) => {
    const user = (socket as any).user;
    logger.info('User connected to WebSocket', { uid: user.uid });
    
    // Join a private room for this user
    socket.join(user.uid);
    
    let ptyProcess: ReturnType<typeof spawn> | null = null;

    socket.on('terminal:start', (options) => {
      // FORCE sandboxing to the user's root unless they are an admin
      const workspace = options?.workspace || '';
      const safeCwd = getSafePath(options?.cwd || '', user, workspace);

      logger.info('Terminal start requested', { safeCwd, uid: user.uid });
      if (ptyProcess) {
        ptyProcess.kill('SIGKILL');
      }
      
      try {
        ptyProcess = spawn('python3', ['-c', 'import pty; pty.spawn("/bin/bash")'], {
          cwd: safeCwd,
          env: { ...process.env, TERM: 'xterm-256color' },
          stdio: ['pipe', 'pipe', 'pipe']
        });

      const MAX_BUFFER_SIZE = 10 * 1024 * 1024; // 10MB
      let stdout = '';
      let stderr = '';
      
      ptyProcess.stdout?.on('data', (data: Buffer) => {
        if (stdout.length + data.length > MAX_BUFFER_SIZE) {
          stdout = stdout.slice(-5 * 1024 * 1024); // Keep last 5MB
        }
        stdout += data;
        socket.emit('terminal:data', data.toString());
      });

      ptyProcess.stderr?.on('data', (data: Buffer) => {
        if (stderr.length + data.length > MAX_BUFFER_SIZE) {
          stderr = stderr.slice(-5 * 1024 * 1024); // Keep last 5MB
        }
        stderr += data;
        socket.emit('terminal:data', data.toString());
      });

        ptyProcess.on('exit', (code: number) => {
          logger.info('PTY process exited', { code });
          socket.emit('terminal:exit', code);
        });

        ptyProcess.on('error', (err) => {
          logger.error('PTY process error', err);
          socket.emit('terminal:data', `\r\n\x1b[31mFailed to start terminal: ${err.message}\x1b[0m\r\n`);
        });
      } catch (err: any) {
        logger.error('Failed to spawn PTY', err);
        socket.emit('terminal:data', `\r\n\x1b[31mFailed to spawn terminal process: ${err.message}\x1b[0m\r\n`);
      }
    });

    socket.on('terminal:data', (data: string) => {
      if (ptyProcess && ptyProcess.stdin) {
        ptyProcess.stdin.write(data);
      }
    });

    socket.on('terminal:resize', (cols: number, rows: number) => {
      // Cannot resize without a real PTY, ignore
    });

    socket.on('disconnect', () => {
      logger.info('Client disconnected from WebSocket');
      if (ptyProcess) {
        ptyProcess.kill('SIGKILL');
      }
    });
  });

  // ERROR HANDLER MUST BE LAST - after all routes and middleware
  app.use(errorHandler);

  server.listen(PORT, '0.0.0.0', () => {
    logger.info(`RapidForge Server running on http://localhost:${PORT}`);
  });

  return { app, server, io };
}

// Start the server
startServer().catch(err => {
  logger.error('Failed to start server', err);
  process.exit(1);
});
