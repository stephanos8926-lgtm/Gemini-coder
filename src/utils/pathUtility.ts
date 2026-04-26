import path from 'path';
import fsSync from 'fs';

export function getSafePath(unsafePath: string, user: any, workspaceRoot: string, workspace: string = '') {
    const base = user.role === 'admin' 
      ? (workspace ? path.join(workspaceRoot, workspace) : workspaceRoot)
      : path.join(workspaceRoot, workspace);
    
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
