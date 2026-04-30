import { Request, Response, NextFunction } from 'express';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { getSafePath, WORKSPACE_ROOT } from '../../src/utils/pathUtility';
import { LogTool } from '../../packages/nexus/telemetry/LogTool';
import { ForgeGuard } from '../../packages/nexus/guard/ForgeGuard';
import { FileSaveSchema, FileCreateSchema, FileDeleteSchema, FileRenameSchema } from '../../src/lib/schemas';
import { bus } from '../../src/lib/ehp/Bus';
import { EHPMessageType, PrincipalType } from '../../src/lib/ehp/types';
import { v4 as uuidv4 } from 'uuid';

const guard = ForgeGuard.init('FileController');
const logger = new LogTool('FileController');

export class FileController {
  private static async listFiles(dir: string, baseDir: string = '', recursive: boolean = false, depth: number = 0, maxDepth: number = 5): Promise<any[]> {
    if (depth > maxDepth) return [];
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const files = await Promise.all(entries.map(async (entry) => {
        const res = path.resolve(dir, entry.name);
        const relativePath = path.relative(baseDir || dir, res);
        if (['node_modules', '.git', 'dist', '.next', '.env'].includes(entry.name) || entry.name.startsWith('.env.')) {
          return [];
        }
        const stats = await fs.stat(res);
        if (entry.isDirectory()) {
          if (recursive) {
            const subFiles = await this.listFiles(res, baseDir || dir, true, depth + 1, maxDepth);
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

  public static async getFiles(req: any, res: Response, next: NextFunction) {
    try {
      await guard.protect(async () => {
        const workspace = (req.query.workspace as string) || `${req.user.uid}/main`;
        const subPath = (req.query.path as string) || '';
        const recursive = req.query.recursive === 'true';
        const targetDir = getSafePath(subPath, req.user, workspace);
        const root = path.join(WORKSPACE_ROOT, workspace);

        await fs.mkdir(targetDir, { recursive: true });
        const files = await this.listFiles(targetDir, root, recursive);
        res.json(files);
      }, { path: '/api/files' });
    } catch (error) {
      next(error);
    }
  }

  public static async saveFile(req: any, res: Response, next: NextFunction) {
    try {
      await guard.protect(async () => {
        const { path: subPath, content, workspace } = FileSaveSchema.parse(req.body);
        const targetPath = getSafePath(subPath, req.user, workspace);
        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.writeFile(targetPath, content);
        res.json({ success: true });
      }, { path: '/api/files/save' });
    } catch (error) {
      next(error);
    }
  }
}
