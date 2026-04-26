import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import fs from 'fs';
import path from 'path';

export async function syncRepo(dir: string, url: string, token: string) {
  const gitDir = path.join(dir, '.git');
  
  // Initialize if not exists
  if (!fs.existsSync(gitDir)) {
      await git.init({ fs, dir });
      await git.addRemote({ fs, dir, remote: 'origin', url });
  }

  // Fetch
  await git.fetch({
    fs,
    http,
    dir,
    remote: 'origin',
    token
  });

  // Decide strategy
  // Simple heuristic: reset if conflicts or force repo preference
  try {
    await git.merge({
      fs,
      dir,
      ours: 'main',
      theirs: 'origin/main',
      author: { name: 'Nexus Sync', email: 'sync@nexus.local' }
    });
  } catch (e) {
    console.warn('Merge failed, forcing repo version...');
    await git.checkout({
      fs,
      dir,
      force: true,
      ref: 'origin/main'
    });
  }
}
