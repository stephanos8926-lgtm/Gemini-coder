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

export async function restoreFile(dir: string, url: string, token: string, filePath: string) {
  const gitDir = path.join(dir, '.git');
  if (!fs.existsSync(gitDir)) {
      await git.init({ fs, dir });
      await git.addRemote({ fs, dir, remote: 'origin', url });
  }

  await git.fetch({
    fs,
    http,
    dir,
    remote: 'origin',
    token
  });

  await git.checkout({
    fs,
    dir,
    filepaths: [filePath],
    ref: 'origin/main'
  });
}

export async function commitAndPush(dir: string, url: string, token: string, message: string) {
  // 1. Add & Commit first
  await git.add({ fs, dir, filepath: '.' });
  await git.commit({
    fs,
    dir,
    author: { name: 'Nexus Sync', email: 'sync@nexus.local' },
    message
  });

  // 2. Fetch
  await git.fetch({ fs, http, dir, remote: 'origin', token });

  // 3. Current branch
  const branch = await git.currentBranch({ fs, dir }) || 'main';

  // 4. Push
  await git.push({
    fs,
    http,
    dir,
    remote: 'origin',
    token,
    ref: branch
  });
}
