// @ts-nocheck
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';
import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import git from 'isomorphic-git';
import { Server } from 'socket.io';
import http from 'http';
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
  no_sandbox: z.boolean(),
});

const AdminUserDeleteSchema = AdminRequestSchema.extend({
  uid: z.string().min(1),
});

const GitPullSchema = AdminRequestSchema.extend({
  repoUrl: z.string().url(),
  branch: z.string().optional().default('main'),
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
        projectId: config.projectId,
      });
      logger.info('Firebase Admin initialized with applicationDefault', { projectId: config.projectId });
    } else {
      app = existingApps[0];
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
    } catch (firestoreError) {
      logger.warn('Failed to initialize Firestore with named database, falling back to default', { 
        databaseId: config.firestoreDatabaseId,
        error: firestoreError.message 
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



const mcpClientPool = new Map<string, Client>();

async function getMcpClient(serverName: string, serverDef: any, workspaceRoot: string) {
  if (mcpClientPool.has(serverName)) {
    return mcpClientPool.get(serverName)!;
  }
  const client = await connectToMCP(serverDef.command, serverDef.args, workspaceRoot);
  mcpClientPool.set(serverName, client);
  return client;
}

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

  app.use(express.json({ limit: '50mb' }));

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
  app.post('/api/mcp/call', async (req: any, res, next) => {
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

  // Endpoint to get all MCP servers and their status
  app.get('/api/mcp/servers', async (req, res, next) => {
    try {
      const config = JSON.parse(await fs.readFile('./mcp-config.json', 'utf-8'));
      const servers = [];
      
      for (const [serverName, serverDef] of Object.entries(config.tools)) {
        const isConnected = mcpClientPool.has(serverName);
        let tools = [];
        
        if (isConnected) {
          try {
            const client = mcpClientPool.get(serverName)!;
            const toolsResponse = await client.listTools();
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
  app.post('/api/mcp/connect', async (req, res, next) => {
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
      } catch (firestoreError) {
        // Only log as warning if it's not a simple NOT_FOUND error
        if (!firestoreError.message?.includes('NOT_FOUND')) {
          logger.warn('Failed to fetch user data from Firestore, using token data only', { 
            uid: decodedToken.uid, 
            error: firestoreError.message 
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

  // Helper to validate path is within workspace
  function getSafePath(unsafePath: string, user: any, workspace: string = '') {
    if (user.role === 'admin') {
      const base = workspace ? path.join(WORKSPACE_ROOT, workspace) : WORKSPACE_ROOT;
      const resolvedPath = path.resolve(base, unsafePath);
      if (!resolvedPath.startsWith(WORKSPACE_ROOT)) {
        throw new Error('Access denied: Path is outside of workspace root');
      }
      return resolvedPath;
    }

    // For regular users, workspace MUST be provided and MUST be in the format "uid/workspace-name"
    if (!workspace) {
      throw new Error('Access denied: Workspace name is required');
    }

    // Ensure the workspace starts with the user's UID and has a sub-folder component
    // Format: <uid>/<project-name>
    const parts = workspace.split(/[/\\]/).filter(Boolean);
    if (parts[0] !== user.uid || parts.length < 2) {
      throw new Error('Access denied: Invalid workspace. You must work within a named project folder.');
    }

    const base = path.join(WORKSPACE_ROOT, workspace);
    const resolvedPath = path.resolve(base, unsafePath);
    
    if (!resolvedPath.startsWith(base)) {
      throw new Error('Access denied: Path is outside of your project workspace');
    }

    // Prevent writing directly to the project root if it's too shallow (optional but safer)
    // The user said: "They should not be able to write to their own parent workspace folder either."
    // This usually means they shouldn't write to workspaces/uid/
    // Our check `parts.length < 2` already ensures they are at least in workspaces/uid/something/
    
    return resolvedPath;
  }

  // Helper to list files (non-recursive by default for lazy loading)
  async function listFiles(dir: string, baseDir: string = '', recursive: boolean = false): Promise<any[]> {
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
            const subFiles = await listFiles(res, baseDir || dir, true);
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
      const userRoot = path.join(WORKSPACE_ROOT, req.user.uid);
      await fs.mkdir(userRoot, { recursive: true });
      
      const entries = await fs.readdir(userRoot, { withFileTypes: true });
      const workspaces = entries
        .filter(entry => entry.isDirectory())
        .map(entry => `${req.user.uid}/${entry.name}`);
      
      res.json(workspaces);
    } catch (error) {
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
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => { stdout += data; });
      child.stderr.on('data', (data) => { stderr += data; });
      
      child.on('close', (code) => {
        logger.info('Child process closed', { code, stdout: stdout.substring(0, 100), stderr: stderr.substring(0, 100) });
        if (code === 0) {
          res.json({ stdout, stderr, success: true });
        } else {
          res.json({ stdout, stderr, success: false });
        }
      });
      
      child.on('error', (error) => {
        logger.error('Child process error', error);
        res.status(500).json({ error: String(error), success: false });
      });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/admin/users', async (req, res, next) => {
    try {
      const { secretKey } = AdminRequestSchema.parse(req.body);
      if (secretKey !== env.ADMIN_SECRET_KEY) {
        logger.warn('Unauthorized admin users access attempt');
        return res.status(403).json({ error: 'Unauthorized' });
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
      const { secretKey, uid, no_sandbox } = AdminUserUpdateSchema.parse(req.body);
      if (secretKey !== env.ADMIN_SECRET_KEY) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      
      await db.collection('users').doc(uid).update({ no_sandbox });
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
      const { repoUrl, branch, secretKey } = GitPullSchema.parse(req.body);
      if (secretKey !== env.ADMIN_SECRET_KEY) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const dir = WORKSPACE_ROOT;
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
          http,
          dir,
          author: { name: 'AI Studio', email: 'ai@studio.build' },
          singleBranch: true
        });
      } else {
        await git.clone({
          fs: fsSync,
          http,
          dir,
          url: repoUrl,
          singleBranch: true
        });
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
      
      let cmd = '';
      switch (command) {
        case 'init': cmd = 'git init'; break;
        case 'add': cmd = 'git add .'; break;
        case 'commit': cmd = `git commit -m ${JSON.stringify(message || 'Update')}`; break;
        case 'pull': cmd = 'git pull'; break;
        default: 
          return res.status(400).json({ error: 'Invalid git command' });
      }
      
      const root = workspace ? path.join(WORKSPACE_ROOT, workspace) : path.join(WORKSPACE_ROOT, req.user.uid);
      
      const { stdout, stderr } = await execAsync(cmd, { cwd: root });
      res.json({ success: true, stdout, stderr });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/admin/logs', async (req, res) => {
    try {
      const { secretKey } = AdminRequestSchema.parse(req.body);
      if (secretKey !== env.ADMIN_SECRET_KEY) {
        logger.warn('Unauthorized admin logs access attempt');
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const logPath = path.join(process.cwd(), 'combined.log');
      if (fsSync.existsSync(logPath)) {
        const logs = await fs.readFile(logPath, 'utf-8');
        // Return last 100 lines
        const lines = logs.trim().split('\n').slice(-100).join('\n');
        res.json({ logs: lines });
      } else {
        res.json({ logs: 'No logs found yet.' });
      }
    } catch (error) {
      logger.error('Failed to read logs', error);
      res.status(500).json({ error: 'Failed to read logs' });
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

      const zip = new AdmZip(req.file.path);
      zip.extractAllTo(root, true);

      await fs.unlink(req.file.path);
      res.json({ success: true });
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
    if (/[`$\\|;&<>(){}]/.test(query as string)) {
      return res.status(400).json({ error: 'Invalid characters in search query' });
    }

    try {
      const root = getSafePath('', req.user, workspace as string);
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      const excludeDirs = ['node_modules', '.git', 'dist', '.next'].map(d => `--exclude-dir=${d}`).join(' ');
      const command = `grep -rnIE ${excludeDirs} "${query}" "${root}"`;
      
      try {
        const { stdout } = await execAsync(command);
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
      } catch (e: any) {
        if (e.code === 1) {
          return res.json([]);
        }
        throw e;
      }
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/chat', async (req, res) => {
    const { messages, model, apiKey, systemInstruction, temperature } = req.body;
    logger.info('Chat request received', { model, temperature, messageCount: messages?.length });
    
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
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

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
          if (done) break;
          res.write(value);
        }
      }
      res.end();
    } catch (error: any) {
      res.status(500).json({ error: String(error) });
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
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
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
      if (ptyProcess) {
        ptyProcess.kill();
      }
      
      const cwd = options?.cwd || process.cwd();
      
      // Use python to spawn a real PTY since node-pty is unavailable
      ptyProcess = spawn('python3', ['-c', 'import pty; pty.spawn("/bin/bash")'], {
        cwd,
        env: { ...process.env, TERM: 'xterm-256color' },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      ptyProcess.stdout?.on('data', (data: Buffer) => {
        socket.emit('terminal:data', data.toString());
      });

      ptyProcess.stderr?.on('data', (data: Buffer) => {
        socket.emit('terminal:data', data.toString());
      });

      ptyProcess.on('exit', (code: number) => {
        socket.emit('terminal:exit', code);
      });
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
        ptyProcess.kill();
      }
    });
  });

  app.use(errorHandler);

  server.listen(PORT, '0.0.0.0', () => {
    logger.info(`GIDE Server running on http://localhost:${PORT}`);
  });
}

startServer();
