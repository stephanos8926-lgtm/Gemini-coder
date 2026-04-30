import { Request, Response } from 'express';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import fs from 'fs';
import path from 'path';
import { GitRequestSchema } from '../../src/lib/schemas';
import { ForgeGuard } from '../../packages/nexus/guard/ForgeGuard';
import { LogTool } from '../../packages/nexus/telemetry/LogTool';

const guard = ForgeGuard.init('GitController');
const logger = new LogTool('GitController');

export class GitController {
  public static async handleGit(req: Request, res: Response) {
    try {
      const { command, dir, url, token, message, filepath, ref } = GitRequestSchema.parse(req.body);
      const fullPath = path.resolve(process.cwd(), dir || '.');

      await guard.protect(async () => {
        switch (command) {
          case 'status':
            const status = await git.statusMatrix({ fs, dir: fullPath });
            return res.json({ status });
          
          case 'commit':
            if (!message) return res.status(400).json({ error: 'Message required' });
            const sha = await git.commit({
              fs,
              dir: fullPath,
              message,
              author: { name: 'GIDE User', email: 'user@gide.local' }
            });
            return res.json({ sha });

          case 'push':
            await git.push({
              fs,
              http,
              dir: fullPath,
              url,
              onAuth: () => ({ username: token || '' }),
              remote: 'origin'
            });
            return res.json({ success: true });

          case 'pull':
            await git.pull({
              fs,
              http,
              dir: fullPath,
              url,
              onAuth: () => ({ username: token || '' }),
              remote: 'origin',
              author: { name: 'GIDE User', email: 'user@gide.local' }
            });
            return res.json({ success: true });

          case 'log':
            const logs = await git.log({ fs, dir: fullPath, depth: 20 });
            return res.json({ logs });

          case 'add':
            if (!filepath) return res.status(400).json({ error: 'Filepath required' });
            await git.add({ fs, dir: fullPath, filepath });
            return res.json({ success: true });

          default:
            return res.status(400).json({ error: 'Invalid git command' });
        }
      }, { path: `/api/git/${command}`, dir });
    } catch (error: any) {
      logger.error('Git error', error);
      res.status(500).json({ error: error.message });
    }
  }
}
