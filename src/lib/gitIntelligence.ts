import { ForgeGuard } from '../../packages/nexus/guard/ForgeGuard';
import { logRedirector } from '../utils/LogRedirector';
import { ProjectContextEngine } from '../utils/ProjectContextEngine';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

export interface RemoteRepoIndex {
  url: string;
  branch: string;
  indexedAt: number;
  files: string[];
}

/**
 * Git Intelligence Tool
 * Allows the AI to scan, index, and query remote repositories for context.
 * Mirrors patterns used by tools like Cursor or GitHub Copilot for remote context.
 */
export class GitIntelligence {
  private static instance: GitIntelligence;
  private guard = ForgeGuard.init('git-intelligence');
  private remoteIndices: Map<string, RemoteRepoIndex> = new Map();
  private readonly TEMP_ROOT = '/tmp/git-intel';

  private constructor() {}

  public static getInstance(): GitIntelligence {
    if (!GitIntelligence.instance) {
      GitIntelligence.instance = new GitIntelligence();
    }
    return GitIntelligence.instance;
  }

  /**
   * Clones a remote repo (shallowly), indexes it, and then cleans up.
   */
  public async indexRemoteRepo(url: string, branch: string = 'main'): Promise<RemoteRepoIndex> {
    return await this.guard.protect(async () => {
      const repoId = Buffer.from(url).toString('base64').substring(0, 12);
      const targetDir = path.join(this.TEMP_ROOT, repoId);

      logRedirector.push('system', 'info', `Indexing remote repo: ${url} [${branch}]`);

      // 1. Shallow clone
      await fs.mkdir(this.TEMP_ROOT, { recursive: true });
      await this.runGit(['clone', '--depth', '1', '--branch', branch, url, targetDir]);

      // 2. Scan file list
      const files: string[] = [];
      const scan = async (dir: string) => {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.name === '.git' || entry.name === 'node_modules') continue;
          if (entry.isDirectory()) await scan(fullPath);
          else files.push(path.relative(targetDir, fullPath));
        }
      };
      await scan(targetDir);

      const index: RemoteRepoIndex = { url, branch, indexedAt: Date.now(), files };
      this.remoteIndices.set(url, index);

      // 3. Cleanup (keep index, delete files to save space)
      await fs.rm(targetDir, { recursive: true, force: true });

      logRedirector.push('system', 'info', `Remote indexing complete. Found ${files.length} files.`);
      return index;
    }, { url, branch });
  }

  private async runGit(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn('git', args);
      child.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Git command failed with code ${code}`));
      });
    });
  }

  public getIndex(url: string): RemoteRepoIndex | undefined {
    return this.remoteIndices.get(url);
  }
}

export const gitIntelligence = GitIntelligence.getInstance();
