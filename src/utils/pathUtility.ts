import path from 'path';
import fsSync from 'fs';

export const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || path.join(process.cwd(), 'workspaces');

export function getSafePath(unsafePath: string, user: any, workspace: string = '') {
    const base = user.role === 'admin' 
      ? (workspace ? path.join(WORKSPACE_ROOT, workspace) : WORKSPACE_ROOT)
      : path.join(WORKSPACE_ROOT, workspace);

    if (!fsSync.existsSync(base)) {
      try {
        fsSync.mkdirSync(base, { recursive: true });
      } catch (err) { }
    }

    const resolvedPath = path.resolve(base, unsafePath);
    
    let realBasePath;
    try {
      realBasePath = fsSync.realpathSync(base);
    } catch {
       realBasePath = path.resolve(base);
    }

    const normalizedResolved = path.normalize(resolvedPath);
    const normalizedBase = path.normalize(realBasePath);

    if (!normalizedResolved.startsWith(normalizedBase + (normalizedBase.endsWith(path.sep) ? '' : path.sep)) && normalizedResolved !== normalizedBase) {
        throw new Error('Access denied: Path is outside of workspace root');
    }

    // Protection against sensitive files
    const fileName = path.basename(normalizedResolved);
    if (user.role !== 'admin' && (
      fileName === '.env' || 
      fileName.startsWith('.env.') || 
      fileName === 'firebase-service-account.json' ||
      fileName === 'firebase-applet-config.json'
    )) {
      throw new Error('Access denied: Sensitive file access restricted');
    }
    
    // Minimal workspace validation for non-admins
    if (user.role !== 'admin' && (!workspace || !workspace.includes(user.uid) || workspace.split(/[/\\]/).filter(Boolean).length < 2)) {
      throw new Error('Access denied: Valid workspace name is required (e.g., uid/main)');
    }

    return resolvedPath;
}

export function validateFilePath(unsafePath: string, user: any, workspace: string = '') {
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
