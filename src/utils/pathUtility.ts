import path from 'path';
import fsSync from 'fs';

export const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || path.join(process.cwd(), 'workspaces');

export function getSafePath(unsafePath: string, user: any, workspace: string = '') {
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
       return resolvedPath; // Fallback
    }

    if (!resolvedPath.startsWith(realBasePath)) {
        throw new Error('Path traversal attempt detected');
    }

    return resolvedPath;
}
