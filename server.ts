import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WORKSPACE_ROOT = path.join(process.cwd(), 'workspaces');

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Ensure workspace root exists
  try {
    await fs.mkdir(WORKSPACE_ROOT, { recursive: true });
  } catch (e) {
    console.error('Failed to create workspace root', e);
  }

  app.use(express.json({ limit: '50mb' }));

  // Helper to validate path is within workspace
  function getSafePath(unsafePath: string, workspace: string = '') {
    const base = workspace ? path.join(WORKSPACE_ROOT, workspace) : WORKSPACE_ROOT;
    const resolvedPath = path.resolve(base, unsafePath);
    if (!resolvedPath.startsWith(WORKSPACE_ROOT)) {
      throw new Error('Access denied: Path outside workspace root');
    }
    // Also ensure it's within the specific sub-workspace if provided
    if (workspace && !resolvedPath.startsWith(path.resolve(WORKSPACE_ROOT, workspace))) {
      throw new Error('Access denied: Path outside sub-workspace');
    }
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
  app.get('/api/workspaces', async (req, res) => {
    try {
      const entries = await fs.readdir(WORKSPACE_ROOT, { withFileTypes: true });
      const workspaces = entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
      res.json(workspaces);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.get('/api/files', async (req, res) => {
    const workspace = (req.query.workspace as string) || '';
    const subPath = (req.query.path as string) || '';
    const recursive = req.query.recursive === 'true';

    try {
      const root = workspace ? path.join(WORKSPACE_ROOT, workspace) : WORKSPACE_ROOT;
      const targetDir = subPath ? getSafePath(subPath, workspace) : root;
      
      await fs.mkdir(targetDir, { recursive: true });
      const files = await listFiles(targetDir, root, recursive);
      res.json(files);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post('/api/tools/run', async (req, res) => {
    const { command, workspace = '' } = req.body;
    if (!command) return res.status(400).json({ error: 'Command required' });

    try {
      const root = workspace ? path.join(WORKSPACE_ROOT, workspace) : WORKSPACE_ROOT;
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      // Sanitize command: only allow certain tools for safety
      const allowedTools = ['npm', 'npx', 'node', 'ls', 'pwd', 'grep', 'cat', 'find'];
      const tool = command.split(' ')[0];
      
      if (!allowedTools.includes(tool)) {
        return res.status(403).json({ error: `Tool '${tool}' is not allowed for security reasons.` });
      }

      const { stdout, stderr } = await execAsync(command, { cwd: root });
      res.json({ stdout, stderr, success: true });
    } catch (error: any) {
      res.status(500).json({ 
        stdout: error.stdout || '', 
        stderr: error.stderr || String(error), 
        success: false 
      });
    }
  });

  app.get('/api/files/content', async (req, res) => {
    const filePath = req.query.path as string;
    const workspace = (req.query.workspace as string) || '';
    if (!filePath) return res.status(400).json({ error: 'Path required' });
    
    try {
      const fullPath = getSafePath(filePath, workspace);
      const content = await fs.readFile(fullPath, 'utf-8');
      res.json({ content });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post('/api/files/save', async (req, res) => {
    const { path: filePath, content, workspace = '' } = req.body;
    if (!filePath) return res.status(400).json({ error: 'Path required' });

    try {
      const fullPath = getSafePath(filePath, workspace);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post('/api/files/create', async (req, res) => {
    const { path: filePath, isDir, workspace = '' } = req.body;
    try {
      const fullPath = getSafePath(filePath, workspace);
      if (isDir) {
        await fs.mkdir(fullPath, { recursive: true });
      } else {
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, '', 'utf-8');
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post('/api/files/delete', async (req, res) => {
    const { path: filePath, workspace = '' } = req.body;
    try {
      const fullPath = getSafePath(filePath, workspace);
      const stats = await fs.stat(fullPath);
      if (stats.isDirectory()) {
        await fs.rm(fullPath, { recursive: true, force: true });
      } else {
        await fs.unlink(fullPath);
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post('/api/files/rename', async (req, res) => {
    const { oldPath, newPath, workspace = '' } = req.body;
    try {
      const fullOldPath = getSafePath(oldPath, workspace);
      const fullNewPath = getSafePath(newPath, workspace);
      await fs.mkdir(path.dirname(fullNewPath), { recursive: true });
      await fs.rename(fullOldPath, fullNewPath);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.get('/api/search', async (req, res) => {
    const { query, workspace = '' } = req.query;
    if (!query) return res.status(400).json({ error: 'Query required' });

    try {
      const root = workspace ? path.join(WORKSPACE_ROOT, workspace as string) : WORKSPACE_ROOT;
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      // Use grep to search. -r (recursive), -n (line number), -I (ignore binary), -E (extended regex)
      // We exclude common directories
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
        // grep returns exit code 1 if no matches found
        if (e.code === 1) {
          return res.json([]);
        }
        throw e;
      }
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post('/api/chat', async (req, res) => {
    const { messages, model, apiKey, systemInstruction, temperature } = req.body;
    
    if (!apiKey) return res.status(400).json({ error: 'API key required' });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
    
    const formattedMessages = messages.map((m: any) => ({
      role: m.role,
      parts: [{ text: m.content }]
    }));

    const body = {
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents: formattedMessages,
      generationConfig: {
        temperature: temperature,
      }
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const err = await response.text();
        return res.status(response.status).json({ error: err });
      }

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
  if (process.env.NODE_ENV !== 'production') {
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GIDE Server running on http://localhost:${PORT}`);
  });
}

startServer();
