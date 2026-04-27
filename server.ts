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
import { Server } from 'socket.io';
import http from 'http';
import https from 'https';
import { HttpClient } from 'isomorphic-git';
import { LogTool } from './packages/nexus/telemetry/LogTool';
import { ForgeGuard } from './packages/nexus/guard/ForgeGuard';
import { FileCacheManager } from './src/utils/FileCacheManager';
import { ProjectContextEngine } from './src/utils/ProjectContextEngine';
import { ServerWatcher } from './src/lib/serverWatcher';
import { logRedirector } from './src/utils/LogRedirector';
import { symbolGraph } from './src/lib/symbolGraph';
import { liveDebugger } from './src/lib/liveDebugger';
import { deepProfiler } from './src/lib/deepProfiler';
import { shadowExecution } from './packages/nexus/utils/ShadowExecutionEngine';
import { scanFile } from './src/security/scanner';
import { TUISensor } from './packages/nexus/guard/sensors/TUISensor';
import { NexusFactory } from './packages/nexus/NexusFactory';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { executeTool } from './src/lib/toolExecutor';
import { summarizeChatHistory } from './src/lib/summarizer';
import { SkillExecutor } from './src/lib/SkillExecutor';
import adminRouter from './src/admin/AdminRouter';
import { routeTask, initBackgroundWorker } from './src/services/TaskRouter';
import { coordinateSwarm } from './src/services/SwarmRouter';
import { sandboxExecute, validateCode } from './src/services/ExecutionSandbox';

const fileCache = FileCacheManager.getInstance();

export interface AuthenticatedRequest extends Request {
  user?: any;
}

// Initialize RapidForge Telemetry
const buildProcesses = new Map<string, ChildProcess>();
const chatSummaries = new Map<string, { summary: string, lastMessageCount: number }>();
const globalSecurityIssues = new Map<string, any[]>(); // filePath -> ScanIssue[]
const logger = new LogTool('server');

// Initialize Guard via Factory
const nexusFactory = NexusFactory.getInstance();
const persistenceManager = nexusFactory.getPersistenceManager();
const guard = nexusFactory.createForgeGuard('server', persistenceManager);
guard.registerSensor('tui', new TUISensor());

// Global Process Error Handlers
process.on('uncaughtException', (error) => {
  logger.error('FATAL UNCAUGHT EXCEPTION', error);
  // Give Winston/ForgeGuard a moment to flush before exiting
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
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
            statusCode: res.statusCode || 200,
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
import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import AdmZip from 'adm-zip';
import { z } from 'zod';
import { FileSaveSchema, FileCreateSchema } from './src/lib/schemas';
import { env } from './server-config';
// @ts-ignore — no types needed for rate-limit config

// Global Error Handler Middleware
function errorHandler(err: express.Error | Error, req: express.Request, res: express.Response, next: express.NextFunction) {
  logger.error('Unhandled error', err, { 
    path: req.path,
    method: req.method 
  });

  if (err instanceof z.ZodError) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: err.issues 
    });
  }

  // Generic response to avoid leaking internal details
  res.status((err as any).status || 500).json({ 
    error: 'Internal Server Error' 
  });
}

// Validation Schemas
const RunToolSchema = z.object({
  command: z.string().min(1),
  workspace: z.string().default(''),
});

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


const FileDeleteSchema = z.object({
  path: z.string().min(1),
  workspace: z.string().default(''),
});

const FileRenameSchema = z.object({
  oldPath: z.string().min(1),
  newPath: z.string().min(1),
  workspace: z.string().default(''),
});

export let db: admin.firestore.Firestore;
export let auth: admin.auth.Auth;

// Initialize Firebase Admin
async function initializeFirebase() {
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    let config = { projectId: undefined, firestoreDatabaseId: undefined };
    
    if (fsSync.existsSync(configPath)) {
      config = JSON.parse(fsSync.readFileSync(configPath, 'utf8'));
      logger.info('Loaded firebase config', { config });
    }
    
    let app: admin.app.App;
    const existingApps = getApps();
    
    if (existingApps.length === 0) {
      // Explicitly set the projectId from the config to match the client-side audience claim.
      // This prevents the "aud" claim mismatch error.
      app = initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: (config.projectId as unknown) as string,
      }) as unknown as admin.app.App;
      logger.info('Firebase Admin initialized with applicationDefault', { projectId: config.projectId });
    } else {
      app = existingApps[0] as unknown as admin.app.App;
      logger.info('Firebase Admin already initialized, using existing app');
    }
    
    // Initialize Firestore
    try {
      // Always initialize with default database
      db = getFirestore(app);
      logger.info('Firestore initialized with default database');
    } catch (firestoreError: unknown) {
      logger.error('CRITICAL: Failed to initialize Firestore', { 
        error: firestoreError
      });
      // Do not continue if Firestore is essential
      throw firestoreError;
    }
    
    auth = getAuth(app);
  } catch (e) {
    logger.error('Failed to initialize Firebase Admin', e as any);
    // Last resort fallback
    try {
      const app = getApps().length === 0 ? initializeApp() : getApps()[0];
      db = getFirestore(app);
      auth = getAuth(app);
      logger.info('Firebase Admin initialized with last resort fallback');
    } catch (err) {
      logger.error('Critical: Failed to initialize Firebase Admin fallback', err as any);
    }
  }

  // Initialize Background Workers
  initBackgroundWorker();
}



import { toolRegistry } from './src/lib/ToolRegistry';
import { skillRegistry } from './src/lib/SkillRegistry';

// Load skills
skillRegistry.loadSkills(path.join(process.cwd(), 'src/skills/definitions'));

const skillExecutor = new SkillExecutor();

// Register tools
toolRegistry.registerTool({
  name: 'read_file',
  description: 'Read the contents of a file.',
  parameters: { type: SchemaType.OBJECT, properties: { path: { type: SchemaType.STRING } }, required: ['path'] }
});
toolRegistry.registerTool({
  name: 'write_file',
  description: 'Write content to a file.',
  parameters: { type: SchemaType.OBJECT, properties: { path: { type: SchemaType.STRING }, content: { type: SchemaType.STRING } }, required: ['path', 'content'] }
});
toolRegistry.registerTool({
  name: 'apply_diff',
  description: 'Apply a unified diff to a file.',
  parameters: { type: SchemaType.OBJECT, properties: { path: { type: SchemaType.STRING }, diff: { type: SchemaType.STRING } }, required: ['path', 'diff'] }
});
toolRegistry.registerTool({
  name: 'search_code',
  description: 'Search for a regex pattern in the codebase.',
  parameters: { type: SchemaType.OBJECT, properties: { pattern: { type: SchemaType.STRING }, dir: { type: SchemaType.STRING } }, required: ['pattern'] }
});
toolRegistry.registerTool({
  name: 'find_symbol',
  description: 'Find the definition and references of a symbol.',
  parameters: { type: SchemaType.OBJECT, properties: { symbol: { type: SchemaType.STRING }, file_pattern: { type: SchemaType.STRING } }, required: ['symbol'] }
});
toolRegistry.registerTool({
  name: 'get_diagnostics',
  description: 'Get linting or compilation errors for a file.',
  parameters: { type: SchemaType.OBJECT, properties: { file_path: { type: SchemaType.STRING } }, required: ['file_path'] }
});
toolRegistry.registerTool({
  name: 'mcp_dispatch',
  description: 'Execute a tool on an MCP server.',
  parameters: { type: SchemaType.OBJECT, properties: { server_name: { type: SchemaType.STRING }, tool_name: { type: SchemaType.STRING }, args: { type: SchemaType.STRING } }, required: ['server_name', 'tool_name', 'args'] }
});
toolRegistry.registerTool({
  name: 'runCommand',
  description: 'Run a shell command or tool in the workspace.',
  parameters: { type: SchemaType.OBJECT, properties: { command: { type: SchemaType.STRING } }, required: ['command'] }
});
toolRegistry.registerTool({
  name: 'web_search',
  description: 'Search the web for information.',
  parameters: { type: SchemaType.OBJECT, properties: { query: { type: SchemaType.STRING } }, required: ['query'] }
});

async function connectToMCP(serverPath: string, args: string[], workspaceRoot: string) {
  const transport = new StdioClientTransport({
    command: serverPath,
    args: args,
    env: {
      ...process.env,
      CWD: workspaceRoot,
    },
  });
  const client = new Client({
    name: "gide-mcp-client",
    version: "1.0.0",
  }, {
    capabilities: {},
  });
  await client.connect(transport);
  return client;
}



const mcpClientPool = new Map<string, { client: Client, lastUsed: number }>();

async function getMcpClient(serverName: string, serverDef: any, workspaceRoot: string) {
  const existing = mcpClientPool.get(serverName);
  if (existing) {
    try {
      await existing.client.listTools();
      existing.lastUsed = Date.now();
      return existing.client;
    } catch {
      logger.warn(`MCP client ${serverName} unresponsive, recreating...`);
      mcpClientPool.delete(serverName);
    }
  }
  const client = await connectToMCP(serverDef.command, serverDef.args, workspaceRoot);
  mcpClientPool.set(serverName, { client, lastUsed: Date.now() });
  return client;
}

// Periodically clean up unused MCP clients
setInterval(() => {
  const now = Date.now();
  for (const [name, entry] of mcpClientPool.entries()) {
    if (now - entry.lastUsed > 300000) { // 5 minutes
      entry.client.close();
      mcpClientPool.delete(name);
      logger.info(`Cleaned up unused MCP client: ${name}`);
    }
  }
}, 60000); // 1 minute

const WORKSPACE_ROOT = path.join(process.cwd(), 'workspaces');
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const upload = multer({ dest: UPLOAD_DIR });

// Server Initialization Function
async function startServer() {
  await initializeFirebase();
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
    if (cachedTools && now - lastConfigRead < 60000) { // Cache for 60 seconds
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

  app.get('/api/mcp/servers', mcpLimiter, async (req, res, next) => {
    try {
      await guard.protect(async () => {
        const config = JSON.parse(await fs.readFile('./mcp-config.json', 'utf-8'));
        const servers = [];
        
        for (const [serverName, serverDef] of Object.entries(config.tools as Record<string, any>)) {
          const isConnected = mcpClientPool.has(serverName);
          let tools: any[] = [];
          
          if (isConnected) {
            try {
              const entry = mcpClientPool.get(serverName)!;
              const toolsResponse = await entry.client.listTools();
              tools = toolsResponse.tools || [];
            } catch (e: any) {
              logger.error(`Error listing tools for ${serverName}:`, e);
            }
          }
          
          servers.push({
            name: serverName,
            status: isConnected ? 'connected' : 'disconnected',
            command: (serverDef as any).command,
            tools
          });
        }
        
        res.json(servers);
      }, { requestId: req.headers['x-request-id'] as string, path: '/api/mcp/servers' });
    } catch (error: any) {
      logger.error('Error getting MCP servers:', error);
      if (!res.headersSent) res.status(500).json({ error: 'Failed to get MCP servers' });
    }
  });

  // Endpoint to explicitly connect to an MCP server
  app.post('/api/mcp/connect', mcpLimiter, async (req, res, next) => {
    try {
      await guard.protect(async () => {
        const { serverName } = req.body;
        const config = JSON.parse(await fs.readFile('./mcp-config.json', 'utf-8'));
        const serverDef = config.tools[serverName];
        
        if (!serverDef) {
          res.status(404).json({ error: 'Server not found' });
          return;
        }
        
        await getMcpClient(serverName, serverDef, WORKSPACE_ROOT);
        res.json({ success: true });
      }, { requestId: req.headers['x-request-id'] as string, path: '/api/mcp/connect' });
    } catch (error) {
      logger.error('Error connecting to MCP server', error as any);
      if (!res.headersSent) res.status(500).json({ error: 'Failed to connect to server' });
    }
  });

  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  if (!ADMIN_EMAIL) {
    logger.error('CRITICAL: ADMIN_EMAIL environment variable is not set');
  }

  // Authentication Middleware
  async function authenticateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const idToken = req.headers.authorization?.split('Bearer ')[1] || req.body.idToken || req.query.idToken;
    
    if (!idToken) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      let userData = {};
      
      try {
        const userDoc = await db.collection('users').doc(decodedToken.uid).get();
        if (userDoc.exists) {
          userData = userDoc.data() || {};
        }
      } catch (firestoreError: unknown) {
        const errorMessage = firestoreError instanceof Error ? firestoreError.message : String(firestoreError);
        if (!errorMessage.includes('NOT_FOUND')) {
          logger.warn('Failed to fetch user data from Firestore, using token data only', { 
            uid: decodedToken.uid, 
            error: errorMessage
          });
        }
      }

      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        displayName: decodedToken.name,
        photoURL: decodedToken.picture,
        role: decodedToken.email === ADMIN_EMAIL ? 'admin' : (userData as any).role || 'user',
        ...userData
      };
      
      // Initialize user-specific logger
      (req as any).logger = new LogTool('server', req.user.uid);
      
      next();
    } catch (error) {
      logger.error('Authentication failed', error as any);
      res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
  }

  // Admin Authorization Middleware
  async function authorizeAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    if (req.user?.email !== ADMIN_EMAIL) {
      (req as any).logger?.warn('Unauthorized admin access attempt');
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
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

  // Helper to validate path is within workspace
  function validateFilePath(unsafePath: string, user: any, workspace: string = '') {
    const resolvedPath = getSafePath(unsafePath, user, workspace);
    // Additional validation: prevent access to hidden files or system files
    const pathComponents = resolvedPath.split(path.sep);
    for (const component of pathComponents) {
      if (component.startsWith('.') && component !== '.') {
        throw new Error('Access denied: Hidden files are not accessible');
      }
    }
    return resolvedPath;
  }

  function getSafePath(unsafePath: string, user: any, workspace: string = '') {
    const base = user.role === 'admin' 
      ? (workspace ? path.join(WORKSPACE_ROOT, workspace) : WORKSPACE_ROOT)
      : path.join(WORKSPACE_ROOT, workspace);
    
    // Ensure base directory exists so we can at least validate against it
    if (!fsSync.existsSync(base)) {
      try {
        fsSync.mkdirSync(base, { recursive: true });
      } catch (err) {
        // Ignore errors here, realpathSync will catch it if it's a real problem
      }
    }

    const resolvedPath = path.resolve(base, unsafePath);
    
    let realBasePath;
    try {
      realBasePath = fsSync.realpathSync(base);
    } catch { 
      realBasePath = path.resolve(base);
    }

    // Check if the resolved path is within the base path
    // We don't use realpathSync on the resolvedPath because it might not exist yet (e.g. for creation)
    const normalizedResolved = path.normalize(resolvedPath);
    const normalizedBase = path.normalize(realBasePath);

    if (!normalizedResolved.startsWith(normalizedBase + path.sep) && normalizedResolved !== normalizedBase) {
      throw new Error('Access denied: Path is outside of workspace root');
    }
    
    if (user.role !== 'admin' && (!workspace || !workspace.includes(user.uid) || workspace.split(/[/\\]/).filter(Boolean).length < 2)) {
      throw new Error('Access denied: Workspace name is required');
    }
    return resolvedPath;
  }

  // Helper to list files (non-recursive by default for lazy loading)
  async function listFiles(dir: string, baseDir: string = '', recursive: boolean = false, depth: number = 0, maxDepth: number = 5): Promise<any[]> {
    if (depth > maxDepth) return [];
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const files = await Promise.all(entries.map(async (entry) => {
        const res = path.resolve(dir, entry.name);
        const relativePath = path.relative(baseDir || dir, res);
        
        // Ignore common noise
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === '.next') {
          return [];
        }

        const stats = await fs.stat(res);

        if (entry.isDirectory()) {
          if (recursive) {
            const subFiles = await listFiles(res, baseDir || dir, true, depth + 1, maxDepth);
            return [{ path: relativePath + '/', isDir: true, size: 0 }, ...subFiles];
          }
          return [{ path: relativePath + '/', isDir: true, size: 0 }];
        } else {
          return [{ path: relativePath, isDir: false, size: stats.size }];
        }
      }));
      return files.flat();
    } catch (e) {
      return [];
    }
  }

  // API Routes
  app.get('/api/workspaces', authenticateUser, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await guard.protect(async () => {
        logger.info('Listing workspaces', { uid: req.user.uid, role: req.user.role });
        
        if (req.user.role === 'admin') {
          const entries = await fs.readdir(WORKSPACE_ROOT, { withFileTypes: true });
          const allWorkspaces: string[] = [];
          
          for (const userDir of entries) {
            if (userDir.isDirectory()) {
              const userPath = path.join(WORKSPACE_ROOT, userDir.name);
              const workspaceEntries = await fs.readdir(userPath, { withFileTypes: true });
              workspaceEntries
                .filter(entry => entry.isDirectory())
                .forEach(entry => allWorkspaces.push(`${userDir.name}/${entry.name}`));
            }
          }
          
          logger.info(`Admin found ${allWorkspaces.length} total workspaces`, { count: allWorkspaces.length });
          return res.json(allWorkspaces);
        }

        const userRoot = path.join(WORKSPACE_ROOT, req.user.uid);
        await fs.mkdir(userRoot, { recursive: true });
        
        const entries = await fs.readdir(userRoot, { withFileTypes: true });
        const workspaces = entries
          .filter(entry => entry.isDirectory())
          .map(entry => `${req.user.uid}/${entry.name}`);
        
        logger.info(`Found ${workspaces.length} workspaces for user ${req.user.uid}`, { workspaces });
        res.json(workspaces);
      }, { requestId: req.headers['x-request-id'] as string, path: '/api/workspaces' });
    } catch (error) {
      logger.error('Failed to list workspaces', error as any);
      next(error);
    }
  });

  app.get('/api/files', authenticateUser, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await guard.protect(async () => {
        const workspace = (req.query.workspace as string) || '';
        const subPath = (req.query.path as string) || '';
        const recursive = req.query.recursive === 'true';

        const targetDir = getSafePath(subPath, req.user, workspace);
        const root = workspace ? path.join(WORKSPACE_ROOT, workspace) : path.join(WORKSPACE_ROOT, req.user.uid);
        
        await fs.mkdir(targetDir, { recursive: true });
        const files = await listFiles(targetDir, root, recursive);
        res.json(files);
      }, { requestId: req.headers['x-request-id'] as string, path: '/api/files' });
    } catch (error) {
      logger.error('Failed to list files', error as any);
      next(error);
    }
  });

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
        const { symbol, file_pattern, workspace } = req.body;
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
        const { file_path, workspace } = req.body;
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

  app.post('/api/git', authenticateUser, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await guard.protect(async () => {
        const { command, message, workspace } = z.object({
          command: z.string(),
          message: z.string().optional(),
          workspace: z.string().optional()
        }).parse(req.body);

        // Ensure workspace belongs to the user
        if (workspace && !workspace.startsWith(req.user.uid)) {
          res.status(403).json({ error: 'Access denied: Workspace does not belong to user' });
          return;
        }

        const execAsync = util.promisify(exec);
        
        const root = workspace ? path.join(WORKSPACE_ROOT, workspace) : path.join(WORKSPACE_ROOT, req.user.uid);
        
        // SECURITY: Validate canonical path to prevent traversal attacks
        const canonicalRoot = await fs.realpath(root).catch(() => root);
        const canonicalWorkspaceRoot = await fs.realpath(WORKSPACE_ROOT).catch(() => WORKSPACE_ROOT);
        
        if (!canonicalRoot.startsWith(canonicalWorkspaceRoot)) {
          logger.error('Path traversal attempt blocked', new Error('Path traversal'), { 
            workspace, 
            root, 
            canonicalRoot, 
            canonicalWorkspaceRoot 
          });
          res.status(403).json({ error: 'Invalid workspace path' });
          return;
        }
        
        switch (command) {
          case 'status':
            const status = await execAsync('git status --short', { cwd: root });
            const branch = await execAsync('git branch --show-current', { cwd: root });
            res.json({ success: true, stdout: status.stdout, branch: branch.stdout.trim() });
            return;
          case 'init': 
            await execAsync('git init', { cwd: root });
            res.json({ success: true });
            return;
          case 'add': 
            await execAsync('git add .', { cwd: root });
            res.json({ success: true });
            return;
          case 'commit': 
            // PRE-COMMIT AI AUDIT (ForgeGuard+)
            const auditResults = await (async () => {
              try {
                const { execSync } = await import('node:child_process');
                // Use --cached to check staged changes
                const changedFiles = execSync('git diff --name-only --cached', { cwd: root }).toString().split('\n').filter(Boolean);
                const issues: any[] = [];
                const { scanFile } = await import('./src/security/scanner.js');
                
                const fsSync = await import('node:fs');
                for (const file of changedFiles) {
                  const fullPath = path.join(root, file);
                  // Only scan TS/JS files in src/
                  if (fsSync.existsSync(fullPath) && (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js'))) {
                    const fileIssues = scanFile(fullPath, false); // false = not backend (user project)
                    issues.push(...fileIssues.filter((i: any) => i.severity === 'critical' || i.severity === 'high'));
                  }
                }
                return issues;
              } catch (e) {
                console.error('Pre-commit audit failed:', e);
                return [];
              }
            })();

            if (auditResults.length > 0) {
              res.status(400).json({ 
                success: false, 
                error: 'AI Audit Blocked: High-severity issues detected in staged changes.',
                issues: auditResults 
              });
              return;
            }

            // Proceed with commit if audit passes
            await new Promise((resolve, reject) => {
              const child = spawn('git', ['commit', '-m', message || 'Update'], { cwd: root });
              const errorChunks: Buffer[] = [];
              
              child.stderr?.on('data', (chunk) => errorChunks.push(chunk));
              child.on('close', (code) => {
                if (code === 0) {
                  resolve(true);
                } else {
                  const stderr = Buffer.concat(errorChunks).toString();
                  reject(new Error(`Git commit failed with code ${code}: ${stderr}`));
                }
              });
              child.on('error', reject);
            });
            res.json({ success: true });
            return;
          case 'push':
            await execAsync('git push', { cwd: root });
            res.json({ success: true });
            return;
          case 'remote-set':
            // Try to add, if fails (already exists), set-url
            await execAsync(`git remote add origin ${message}`, { cwd: root }).catch(async () => {
              await execAsync(`git remote set-url origin ${message}`, { cwd: root });
            });
            res.json({ success: true });
            return;
          case 'remote-get':
            const remote = await execAsync('git remote get-url origin', { cwd: root }).catch(() => ({ stdout: '' }));
            res.json({ success: true, stdout: remote.stdout.trim() });
            return;
          case 'pull': 
            await execAsync('git pull', { cwd: root });
            res.json({ success: true });
            return;
          case 'diff':
            const diff = await execAsync('git diff --cached', { cwd: root });
            res.json({ success: true, stdout: diff.stdout });
            return;
          default: 
            res.status(400).json({ error: 'Invalid git command' });
        }
      }, { requestId: req.headers['x-request-id'] as string, path: '/api/git' });
    } catch (error) {
      next(error);
    }
  });

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
  app.post('/api/chat', authenticateUser, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await guard.protect(async () => {
        const { messages, model, apiKey, systemInstruction, temperature, skillName, skillState } = req.body;
        const userId = req.user.uid || 'anonymous';
        const cacheKey = `${userId}-${model}`;

        // Skill-based orchestration
        if (skillName) {
          const { result, nextState } = await skillExecutor.execute(skillName, messages[messages.length - 1].content, skillState);
          return res.json({ response: result, nextState });
        }
        
        let currentMessages = messages;

        if (!apiKey) {
          logger.warn('Chat request missing API key');
          res.status(400).json({ error: 'API key required' });
          return;
        }

        if (messages.length > 20) {
          logger.info('Summarizing chat history');
          const cached = chatSummaries.get(cacheKey);
          
          // Only re-summarize if we have at least 10 new messages
      if (!cached || messages.length - cached.lastMessageCount >= 10) {
        const summary = await summarizeChatHistory(messages.slice(0, -10), apiKey, cached?.summary);
        chatSummaries.set(cacheKey, { summary, lastMessageCount: messages.length - 10 });
        currentMessages = [
          { role: 'system', content: `Previous context summary: ${summary}` },
          ...messages.slice(-10)
        ];
      } else {
        currentMessages = [
          { role: 'system', content: `Previous context summary: ${cached.summary}` },
          ...messages.slice(-10)
        ];
      }
    }
    
    const ai = new GoogleGenerativeAI(apiKey);
    const generativeModel = ai.getGenerativeModel({ model, systemInstruction });
    
    const formattedMessages = currentMessages.map((m: any) => {
      const parts: any[] = [];
      if (m.content) {
        parts.push({ text: m.content });
      }
      if (m.functionCalls) {
        m.functionCalls.forEach((fc: any) => {
          parts.push({ functionCall: { name: fc.name, args: fc.args } });
        });
      }
      if (m.functionResponses) {
        m.functionResponses.forEach((fr: any) => {
          parts.push({ functionResponse: { name: fr.name, response: fr.response } });
        });
      }
      return {
        role: m.role === 'function' ? 'user' : m.role, // Gemini uses 'user' role for function responses
        parts
      };
    });

    const enabledMcpTools = await getEnabledTools();
    const mcpFunctionDeclarations = enabledMcpTools.map(tool => ({
      name: tool.name.replace(/[^a-zA-Z0-9_]/g, '_'), // Ensure valid function name
      description: tool.description || `Execute a tool on the ${tool.name} MCP server.`,
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          toolName: { type: SchemaType.STRING, description: 'The specific tool to execute on this server (e.g., read_file, search).' },
          args: { type: SchemaType.STRING, description: 'JSON string of arguments for the tool.' }
        },
        required: ['toolName', 'args']
      }
    }));

    const tools = [
      ...toolRegistry.getSystemPromptBlock(),
      {
        functionDeclarations: [
          ...mcpFunctionDeclarations
        ]
      }
    ];

    try {
      logger.info('Sending request to Gemini API');
      
      let currentMessages = formattedMessages;
      let resultStream = await generativeModel.generateContentStream({
        contents: currentMessages,
        generationConfig: {
          temperature: temperature,
        },
        tools: tools as any
      });

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let finalResponse = '';
      for await (const chunk of resultStream.stream) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        finalResponse += chunk.text();
      }

      // Check if the model wants to call a tool
      let lastResponse = await resultStream.response;
      let functionCalls = lastResponse.functionCalls();
      while (functionCalls && functionCalls.length > 0) {
        logger.info('Model requested tool calls', { functionCalls: functionCalls });
        
        const functionResponses: any[] = [];
        for (const call of functionCalls) {
          const result = await executeTool(call.name, call.args, {});
          functionResponses.push({ name: call.name, response: result });
        }

        // Add tool results to messages
        currentMessages.push({ role: 'model', parts: [{ functionCall: functionCalls[0] }] });
        currentMessages.push({ role: 'function', parts: functionResponses.map(fr => ({ functionResponse: { name: fr.name, response: fr.response } })) });
        
        // Loop back to Gemini
        resultStream = await generativeModel.generateContentStream({
          contents: currentMessages,
          generationConfig: {
            temperature: temperature,
          },
          tools: tools as any
        });

        for await (const chunk of resultStream.stream) {
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }
        lastResponse = await resultStream.response;
        functionCalls = lastResponse.functionCalls();
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      if (!res.headersSent) res.status(500).json({ error: String(error) });
      else res.end();
    }
      }, { requestId: req.headers['x-request-id'] as string, path: '/api/chat' });
    } catch (error) {
      next(error);
    }
  });


  app.get('/api/security/audit', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Flatten global issues map
      const allIssues = Array.from(globalSecurityIssues.entries()).flatMap(([file, issues]) => 
        issues.map(i => ({ ...i, id: crypto.randomUUID() }))
      );
      
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

  app.get('/api/context/stats', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      res.json({
        stats: symbolGraph.getIndexStats(),
        recentSymbols: symbolGraph.getRecentSymbols(15)
      });
    } catch (e) {
      logger.error('Failed to fetch context stats', e instanceof Error ? e : new Error(String(e)));
      res.status(500).json({ error: 'Failed to fetch context stats' });
    }
  });

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
      origin: process.env.ALLOWED_ORIGINS?.split(',') || [process.env.CLIENT_URL || 'http://localhost:5173'],
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
  app.post('/api/context/index', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { workspace } = req.body;
      const root = workspace ? path.join(WORKSPACE_ROOT, workspace) : path.join(WORKSPACE_ROOT, req.user.uid);
      
      // Start indexing in background
      ProjectContextEngine.getInstance().indexProject(root).catch(err => {
        logger.error('Background indexing failed', err);
        logRedirector.push('system', 'error', `Indexing failed: ${err.message}`);
      });
      
      res.json({ status: 'indexing_started' });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.get('/api/context/search', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
    const { q } = req.query;
    if (typeof q !== 'string') return res.status(400).json({ error: 'Query required' });
    
    const results = ProjectContextEngine.getInstance().search(q);
    res.json({ results });
  });

  app.post('/api/context/relevant', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { query, limit, skillContext } = req.body;
      if (typeof query !== 'string') return res.status(400).json({ error: 'Query required' });
      
      const results = await ProjectContextEngine.getInstance().getRelevantContext(query, limit, skillContext);
      res.json({ results });
    } catch (error) {
      logger.error('Failed to get relevant context', error as any);
      res.status(500).json({ error: String(error) });
    }
  });

  app.get('/api/context/index', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
    const index = ProjectContextEngine.getInstance().getIndex();
    res.json({ index });
  });

  app.get('/api/context/docs', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
    const docs = ProjectContextEngine.getInstance().getDocs();
    res.json({ docs });
  });

  app.get('/api/context/graph', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
    res.json({ summary: symbolGraph.getGraphSummary() });
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
    io.emit('fs-event', { event, path: filePath });

    // Update Symbol Graph on change
    if ((event === 'add' || event === 'change') && (filePath.endsWith('.ts') || filePath.endsWith('.tsx'))) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        symbolGraph.updateFile(filePath, content);

        // Proactive Security Scan
        const scanner = fork('./src/scripts/run-audit.ts', [filePath]);
        scanner.on('message', (issues: any[]) => {
            if (Array.isArray(issues)) {
              globalSecurityIssues.set(filePath, issues);
              io.emit('security-alert', { path: filePath, issues });
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

  io.on('connection', (socket) => {
    logger.info('Client connected to WebSocket');
    
    let ptyProcess: ReturnType<typeof spawn> | null = null;

    socket.on('terminal:start', (options) => {
      logger.info('Terminal start requested', { options, uid: socket.id });
      if (ptyProcess) {
        logger.info('Killing existing PTY process');
        ptyProcess.kill('SIGKILL');
      }
      
      const cwd = options?.cwd ? path.join(WORKSPACE_ROOT, options.cwd) : process.cwd();
      logger.info('Spawning PTY', { cwd });
      
      // Use python to spawn a real PTY since node-pty is unavailable
      try {
        ptyProcess = spawn('python3', ['-c', 'import pty; pty.spawn("/bin/bash")'], {
          cwd,
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
    logger.info(`GIDE Server running on http://localhost:${PORT}`);
  });

  return { app, server, io };
}

// Start the server
startServer().catch(err => {
  logger.error('Failed to start server', err);
  process.exit(1);
});
