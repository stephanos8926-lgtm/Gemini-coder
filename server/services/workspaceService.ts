import fs from 'fs/promises';
import path from 'path';
import { WORKSPACE_ROOT } from '../../src/utils/pathUtility';

export const workspaceService = {
  async listWorkspaces(user: any): Promise<string[]> {
    if (user.role === 'admin') {
      const entries = await fs.readdir(WORKSPACE_ROOT, { withFileTypes: true });
      const allWorkspaces: string[] = [];
      
      for (const userDir of entries) {
        if (userDir.isDirectory()) {
          const userPath = path.join(WORKSPACE_ROOT, userDir.name);
          const workspaceEntries = await fs.readdir(userPath, { withFileTypes: true });
          workspaceEntries
            .filter(entry => entry.isDirectory())
            .forEach(entry => allWorkspaces.push(`${userDir.name}/${entry.name}`));
        }
      }
      return allWorkspaces;
    }

    const userRoot = path.join(WORKSPACE_ROOT, user.uid);
    await fs.mkdir(userRoot, { recursive: true });
    
    const entries = await fs.readdir(userRoot, { withFileTypes: true });
    return entries
      .filter(entry => entry.isDirectory())
      .map(entry => `${user.uid}/${entry.name}`);
  }
};
