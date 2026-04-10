import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';
import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import crypto from 'crypto';
import git from 'isomorphic-git';
import { Server } from 'socket.io';
import http from 'http';
import https from 'https';
import { HttpClient } from 'isomorphic-git';

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
import chokidar from 'chokidar';
import admin from 'firebase-admin';
import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import AdmZip from 'adm-zip';
import winston from 'winston';
import { z } from 'zod';
import { FileSaveSchema, FileCreateSchema } from './src/lib/schemas';
import { env } from './server-config';
// @ts-ignore — no types needed for rate-limit config

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Validation Schemas
const RunToolSchema = z.object({
  command: z.string().min(1),
  workspace: z.string().optional().default(''),
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
  branch: z.string().optional().default('main'),
  target: z.enum(['root', 'workspaces']).optional().default('workspaces'),
});


const FileDeleteSchema = z.object({
  path: z.string().min(1),
  workspace: z.string().optional().default(''),
});

const FileRenameSchema = z.object({
  oldPath: z.string().min(1),
  newPath: z.string().min(1),
  workspace: z.string().optional().default(''),
});

let db: admin.firestore.Firestore;
let auth: admin.auth.Auth;

// Initialize Firebase Admin
async function initializeFirebase() {
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    let config = { projectId: undefined, firestoreDatabaseId: undefined };
    
    if (fsSync.existsSync(configPath)) {
      config = JSON.parse(fsSync.readFileSync(configPath, 'utf8'));
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
    
    // Initialize Firestore with the specific database ID if provided
    // If the named database fails, we fallback to the default one
    try {
      db = config.firestoreDatabaseId 
        ? getFirestore(app, config.firestoreDatabaseId)
        : getFirestore(app);
      
      // Test the connection to catch PERMISSION_DENIED early
      await db.collection('users').limit(1).get();
      logger.info('Firestore connection successful', { databaseId: config.firestoreDatabaseId || '(default)' });
    } catch (firestoreError: unknown) {
      const errorMessage = firestoreError instanceof Error ? firestoreError.message : String(firestoreError);
      logger.warn('Failed to initialize Firestore with named database, falling back to default', { 
        databaseId: config.firestoreDatabaseId,
        error: errorMessage
      });
      db = getFirestore(app);
    }
    
    auth = getAuth(app);
  } catch (e) {
    logger.error('Failed to initialize Firebase Admin', e);
    // Last resort fallback
    try {
      const app = getApps().length === 0 ? initializeApp() : getApps()[0];
      db = getFirestore(app);
      auth = getAuth(app);
      logger.info('Firebase Admin initialized with last resort fallback');
    } catch (err) {
      logger.error('Critical: Failed to initialize Firebase Admin fallback', err);
    }
  }
}

// MCP Client Skeleton
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

async function startServer() {
  await initializeFirebase();
  logger.info('Starting server...');
  const app = express();
  const PORT = 3000;

  // Ensure workspace root exists
  try {
    await fs.mkdir(WORKSPACE_ROOT, { recursive: true });
    logger.info('Workspace root initialized', { WORKSPACE_ROOT });
  } catch (e) {
    logger.error('Failed to create workspace root', e);
  }

  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    logger.info('Upload directory initialized', { UPLOAD_DIR });
  } catch (e) {
    logger.error('Failed to create upload directory', e);
  }

  // CSRF Protection Middleware
  const csrfProtection = (req: any, res: any, next: any) => {
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

  app.use(express.json({ limit: '5mb' }));

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
    } catch (error) {
      console.error('Error reading mcp-config.json:', error);
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
          } catch (e) {
            console.error(`Error listing tools for ${serverName}:`, e);
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
    } catch (error) {
      console.error('Error getting MCP servers:', error);
      res.status(500).json({ error: 'Failed to get MCP servers' });
    }
  });

  // Endpoint to explicitly connect to an MCP server
  app.post('/api/mcp/connect', mcpLimiter, async (req, res, next) => {
    const { serverName } = req.body;
    try {
      const config = JSON.parse(await fs.readFile('./mcp-config.json', 'utf-8'));
      const serverDef = config.tools[serverName];
      
      if (!serverDef) {
        return res.status(404).json({ error: 'Server not found' });
      }
      
      await getMcpClient(serverName, serverDef, WORKSPACE_ROOT);
      res.json({ success: true });
    } catch (error) {
      console.error(`Error connecting to MCP server ${serverName}:`, error);
      res.status(500).json({ error: 'Failed to connect to server' });
    }
  });

  app.get('/api/admin/mcp/tools', async (req, res, next) => {
    const tools = await getEnabledTools();
    res.json(tools);
  });

  app.post('/api/admin/mcp/tools/:name', async (req: any, res, next) => {
    const { name } = req.params;
    const { enabled } = req.body;
    
    try {
      const config = JSON.parse(await fs.readFile('./mcp-config.json', 'utf-8'));
      if (config.tools[name]) {
        config.tools[name].enabled = enabled;
        await fs.writeFile('./mcp-config.json', JSON.stringify(config, null, 2));
        res.json({ status: 'updated' });
      } else {
        res.status(404).json({ error: 'Tool not found' });
      }
    } catch (error) {
      console.error('Error updating mcp-config.json:', error);
      res.status(500).json({ error: 'Failed to update tool' });
    }
  });

  const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Too many requests, please try again later.' },
  });
  app.use('/api/admin', adminLimiter);
  app.use((req, res, next) => {
    // Filter out noisy static asset requests from logs
    const isStaticAsset = req.url.includes('/src/') || 
                          req.url.includes('/node_modules/') || 
                          req.url.endsWith('.js') || 
                          req.url.endsWith('.css') || 
                          req.url.endsWith('.svg') || 
                          req.url.endsWith('.png') || 
                          req.url.endsWith('.jpg') || 
                          req.url.endsWith('.json') ||
                          req.url.includes('@vite') ||
                          req.url.includes('__vite');

    if (!isStaticAsset) {
      logger.info(`${req.method} ${req.url}`, { ip: req.ip });
    }
    next();
  });

  // Global Error Handler Middleware
  const errorHandler: express.ErrorRequestHandler = (err, req, res, next) => {
    logger.error('Unhandled error', { 
      error: err.message, 
      stack: err.stack,
      path: req.path,
      method: req.method 
    });

    if (err instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: err.issues 
      });
    }

    res.status(err.status || 500).json({ 
      error: err.message || 'Internal Server Error' 
    });
  };

  // Authentication Middleware
  const authenticateUser = async (req: any, res: any, next: any) => {
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
        // Only log as warning if it's not a simple NOT_FOUND error
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
        role: 'user', // Default role
        ...userData
      };
      next();
    } catch (error) {
      logger.error('Authentication failed', error);
      res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
  };

  // Endpoint for GIDE to call tools
  app.post('/api/mcp/call', authenticateUser, async (req: any, res, next) => {
    const { serverName, toolName, args } = req.body;
    
    try {
      const config = JSON.parse(await fs.readFile('./mcp-config.json', 'utf-8'));
      const serverDef = config.tools[serverName];
      
      if (!serverDef) {
        return res.status(404).json({ error: 'Server not found' });
      }
      
      // Get pooled client
      const client = await getMcpClient(serverName, serverDef, WORKSPACE_ROOT);
      
      // Call tool
      const result = await client.callTool({
        name: toolName,
        arguments: args,
      });
      
      res.json(result);
    } catch (error) {
      console.error('Error calling MCP tool:', error);
      res.status(500).json({ error: 'Failed to call tool' });
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
    const resolvedPath = path.resolve(base, unsafePath);
    
    let realResolvedPath, realBasePath;
    try {
      realResolvedPath = fsSync.realpathSync(resolvedPath);
      realBasePath = fsSync.realpathSync(base);
    } catch { 
      throw new Error('Access denied: Invalid path or missing directory'); 
    }
    
    if (!realResolvedPath.startsWith(realBasePath + path.sep) && realResolvedPath !== realBasePath) {
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
  app.get('/api/workspaces', authenticateUser, async (req: any, res, next) => {
    try {
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
    } catch (error) {
      logger.error('Failed to list workspaces', error);
      next(error);
    }
  });

  app.get('/api/files', authenticateUser, async (req: any, res, next) => {
    const workspace = (req.query.workspace as string) || '';
    const subPath = (req.query.path as string) || '';
    const recursive = req.query.recursive === 'true';

    try {
      const targetDir = getSafePath(subPath, req.user, workspace);
      const root = workspace ? path.join(WORKSPACE_ROOT, workspace) : path.join(WORKSPACE_ROOT, req.user.uid);
      
      await fs.mkdir(targetDir, { recursive: true });
      const files = await listFiles(targetDir, root, recursive);
      res.json(files);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/tools/run', authenticateUser, async (req: any, res, next) => {
    try {
      const { command, workspace } = RunToolSchema.parse(req.body);
      logger.info('Running tool', { command, workspace, uid: req.user.uid });

      const isSandboxed = !req.user.no_sandbox;
      const isAdmin = req.user.role === 'admin';

      const root = workspace ? path.join(WORKSPACE_ROOT, workspace) : path.join(WORKSPACE_ROOT, req.user.uid);
      await fs.mkdir(root, { recursive: true });

      if (isAdmin) {
        logger.info('Running admin command', { command });
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        const { stdout, stderr } = await execAsync(command, { cwd: root });
        return res.json({ stdout, stderr, success: true });
      }

      // Sanitize command: only allow certain tools for safety
      let allowedTools = ['npm', 'npx', 'node', 'ls', 'pwd', 'grep', 'cat', 'find', 'git', 'head', 'tail', 'diff', 'du', 'df'];
      if (!isSandboxed) {
        allowedTools = [...allowedTools, 'rm', 'mv', 'cp', 'mkdir', 'tar', 'zip', 'curl', 'wget'];
      }
      
      const [tool, ...args] = command.split(' ');
      
      if (!allowedTools.includes(tool)) {
        logger.warn('Unauthorized tool access attempt', { tool, command });
        return res.status(403).json({ error: `Tool '${tool}' is not allowed for security reasons.` });
      }

      logger.info('Spawning child process', { tool, args });
      const child = spawn(tool, args, { cwd: root });
      
      const processTimeout = setTimeout(() => { 
        child.kill('SIGTERM'); 
        logger.warn('Child process timed out and was killed'); 
      }, 30_000);
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => { stdout += data; });
      child.stderr.on('data', (data) => { stderr += data; });
      
      child.on('close', (code) => {
        clearTimeout(processTimeout);
        logger.info('Child process closed', { code, stdout: stdout.substring(0, 100), stderr: stderr.substring(0, 100) });
        if (!res.headersSent) {
          if (code === 0) {
            res.json({ stdout, stderr, success: true });
          } else {
            res.json({ stdout, stderr, success: false });
          }
        }
      });
      
      child.on('error', (error) => {
        clearTimeout(processTimeout);
        logger.error('Child process error', error);
        if (!res.headersSent) {
          res.status(500).json({ error: String(error), success: false });
        }
      });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/tools/find_symbol', authenticateUser, async (req: any, res, next) => {
    try {
      const { symbol, file_pattern, workspace } = req.body;
      const root = workspace ? path.join(WORKSPACE_ROOT, workspace) : path.join(WORKSPACE_ROOT, req.user.uid);
      
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
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
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/tools/diagnostics', authenticateUser, async (req: any, res, next) => {
    try {
      const { file_path, workspace } = req.body;
      const targetPath = getSafePath(file_path, req.user, workspace);
      const root = workspace ? path.join(WORKSPACE_ROOT, workspace) : path.join(WORKSPACE_ROOT, req.user.uid);
      
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
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
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/admin/users', async (req, res, next) => {
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
      logger.error('Failed to fetch users', error);
      next(error);
    }
  });

  app.post('/api/admin/users/update', async (req, res, next) => {
    try {
      const { secretKey, uid, no_sandbox, role } = AdminUserUpdateSchema.parse(req.body);
      if (secretKey !== env.ADMIN_SECRET_KEY) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      
      const updateData: any = {};
      if (no_sandbox !== undefined) updateData.no_sandbox = no_sandbox;
      if (role !== undefined) updateData.role = role;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'No update data provided' });
      }

      await db.collection('users').doc(uid).update(updateData);
      res.json({ success: true });
    } catch (error) {
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

  app.post('/api/git', authenticateUser, async (req: any, res, next) => {
    try {
      const { command, message, workspace } = z.object({
        command: z.string(),
        message: z.string().optional(),
        workspace: z.string().optional()
      }).parse(req.body);

      // Ensure workspace belongs to the user
      if (workspace && !workspace.startsWith(req.user.uid)) {
        return res.status(403).json({ error: 'Access denied: Workspace does not belong to user' });
      }

      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      const root = workspace ? path.join(WORKSPACE_ROOT, workspace) : path.join(WORKSPACE_ROOT, req.user.uid);
      
      switch (command) {
        case 'init': 
          await execAsync('git init', { cwd: root });
          return res.json({ success: true });
        case 'add': 
          await execAsync('git add .', { cwd: root });
          return res.json({ success: true });
        case 'commit': 
          await new Promise((resolve, reject) => {
            const child = spawn('git', ['commit', '-m', message || 'Update'], { cwd: root });
            child.on('close', (code) => {
              if (code === 0) resolve(true);
              else reject(new Error(`Git commit failed with code ${code}`));
            });
          });
          return res.json({ success: true });
        case 'pull': 
          await execAsync('git pull', { cwd: root });
          return res.json({ success: true });
        default: 
          return res.status(400).json({ error: 'Invalid git command' });
      }
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

  app.post('/api/import-zip', upload.single('zip'), authenticateUser, async (req: any, res, next) => {
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

  app.get('/api/files/content', authenticateUser, async (req: any, res, next) => {
    const filePath = req.query.path as string;
    const workspace = (req.query.workspace as string) || '';
    if (!filePath) {
      return res.status(400).json({ error: 'Path required' });
    }
    
    try {
      const fullPath = getSafePath(filePath, req.user, workspace);
      const content = await fs.readFile(fullPath, 'utf-8');
      res.json({ content });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/files/save', authenticateUser, async (req: any, res, next) => {
    try {
      const { path: filePath, content, workspace } = FileSaveSchema.parse(req.body);
      const fullPath = getSafePath(filePath, req.user, workspace);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/files/create', authenticateUser, async (req: any, res, next) => {
    try {
      const { path: filePath, isDir, workspace } = FileCreateSchema.parse(req.body);
      const fullPath = getSafePath(filePath, req.user, workspace);
      if (isDir) {
        await fs.mkdir(fullPath, { recursive: true });
      } else {
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, '', 'utf-8');
      }
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/files/delete', authenticateUser, async (req: any, res, next) => {
    try {
      const { path: filePath, workspace } = FileDeleteSchema.parse(req.body);
      const fullPath = getSafePath(filePath, req.user, workspace);
      const stats = await fs.stat(fullPath);
      if (stats.isDirectory()) {
        await fs.rm(fullPath, { recursive: true, force: true });
      } else {
        await fs.unlink(fullPath);
      }
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/files/rename', authenticateUser, async (req: any, res, next) => {
    try {
      const { oldPath, newPath, workspace } = FileRenameSchema.parse(req.body);
      const fullOldPath = getSafePath(oldPath, req.user, workspace);
      const fullNewPath = getSafePath(newPath, req.user, workspace);
      await fs.mkdir(path.dirname(fullNewPath), { recursive: true });
      await fs.rename(fullOldPath, fullNewPath);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/search', authenticateUser, async (req: any, res, next) => {
    const { query, workspace = '' } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Query required' });
    }

    try {
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
    } catch (error) {
      next(error);
    }
  });

  // SECURITY: Chat endpoint REQUIRES authentication
  // Without this, anyone can access the endpoint and potentially leak/abuse API keys
  app.post('/api/chat', authenticateUser, async (req: any, res: express.Response) => {
    const { messages, model, apiKey, systemInstruction, temperature } = req.body;
    
    logger.info('Chat request received', { model, temperature, messageCount: messages?.length, uid: req.user.uid });
    
    if (!apiKey) {
      logger.warn('Chat request missing API key');
      return res.status(400).json({ error: 'API key required' });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
    
    const formattedMessages = messages.map((m: any) => {
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
        type: 'object',
        properties: {
          toolName: { type: 'string', description: 'The specific tool to execute on this server (e.g., read_file, search).' },
          args: { type: 'string', description: 'JSON string of arguments for the tool.' }
        },
        required: ['toolName', 'args']
      }
    }));

    const tools = [
      {
        functionDeclarations: [
          {
            name: 'read_file',
            description: 'Read the contents of a file.',
            parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] }
          },
          {
            name: 'write_file',
            description: 'Write content to a file.',
            parameters: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] }
          },
          {
            name: 'apply_diff',
            description: 'Apply a unified diff to a file.',
            parameters: { type: 'object', properties: { path: { type: 'string' }, diff: { type: 'string' } }, required: ['path', 'diff'] }
          },
          {
            name: 'search_code',
            description: 'Search for a regex pattern in the codebase.',
            parameters: { type: 'object', properties: { pattern: { type: 'string' }, dir: { type: 'string' } }, required: ['pattern'] }
          },
          {
            name: 'find_symbol',
            description: 'Find the definition and references of a symbol.',
            parameters: { type: 'object', properties: { symbol: { type: 'string' }, file_pattern: { type: 'string' } }, required: ['symbol'] }
          },
          {
            name: 'get_diagnostics',
            description: 'Get linting or compilation errors for a file.',
            parameters: { type: 'object', properties: { file_path: { type: 'string' } }, required: ['file_path'] }
          },
          {
            name: 'mcp_dispatch',
            description: 'Execute a tool on an MCP server.',
            parameters: { type: 'object', properties: { server_name: { type: 'string' }, tool_name: { type: 'string' }, args: { type: 'string' } }, required: ['server_name', 'tool_name', 'args'] }
          },
          {
            name: 'runCommand',
            description: 'Run a shell command or tool in the workspace.',
            parameters: {
              type: 'object',
              properties: {
                command: { type: 'string', description: 'The command to run.' }
              },
              required: ['command']
            }
          },
          ...mcpFunctionDeclarations
        ]
      }
    ];

    const body = {
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents: formattedMessages,
      generationConfig: {
        temperature: temperature,
      },
      tools: tools
    };

    try {
      logger.info('Sending request to Gemini API');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60_000);

      req.on('close', () => { controller.abort(); logger.info('Client disconnected, aborting Gemini stream'); });

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const err = await response.text();
        logger.error('Gemini API request failed', { status: response.status, err });
        return res.status(response.status).json({ error: err });
      }

      logger.info('Gemini API request successful, starting stream');
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      if (response.body) {
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done || !res.writable) break;
          try { res.write(value); } catch (e) { logger.error('SSE write failed', e); break; }
        }
      }
      res.end();
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      if (!res.headersSent) res.status(500).json({ error: String(error) });
      else res.end();
    }
  });

  // Vite middleware
  if (env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('/*splat', (req, res) => {
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

  // File system watcher
  const watcher = chokidar.watch('workspaces', {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true
  });

  watcher.on('all', (event, filePath) => {
    logger.info(`File system event: ${event} on ${filePath}`);
    io.emit('fs-event', { event, path: filePath });
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

  app.use(errorHandler);

  server.listen(PORT, '0.0.0.0', () => {
    logger.info(`GIDE Server running on http://localhost:${PORT}`);
  });
}

startServer();
