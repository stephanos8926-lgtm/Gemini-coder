import { FileStore } from './fileStore';

export const filesystemService = {
  workspace: '',

  setWorkspace(name: string) {
    this.workspace = name;
  },

  async listWorkspaces(): Promise<string[]> {
    const res = await fetch('/api/workspaces');
    if (!res.ok) throw new Error('Failed to list workspaces');
    return res.json();
  },

  async listFiles(path: string = '', recursive: boolean = false): Promise<{ path: string, isDir: boolean, size: number }[]> {
    const url = `/api/files?workspace=${encodeURIComponent(this.workspace)}&path=${encodeURIComponent(path)}&recursive=${recursive}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to list files');
    return res.json();
  },

  async runTool(command: string): Promise<{ stdout: string, stderr: string, success: boolean }> {
    const res = await fetch('/api/tools/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, workspace: this.workspace }),
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Command failed with status ${res.status}`);
    }
    
    return res.json();
  },

  async getFileContent(path: string): Promise<string> {
    const url = `/api/files/content?path=${encodeURIComponent(path)}${this.workspace ? `&workspace=${encodeURIComponent(this.workspace)}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to read file: ${path}`);
    const data = await res.json();
    return data.content;
  },

  async saveFile(path: string, content: string): Promise<void> {
    const res = await fetch('/api/files/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content, workspace: this.workspace }),
    });
    if (!res.ok) throw new Error(`Failed to save file: ${path}`);
  },

  async createFile(path: string, isDir: boolean = false): Promise<void> {
    const res = await fetch('/api/files/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, isDir, workspace: this.workspace }),
    });
    if (!res.ok) throw new Error(`Failed to create ${isDir ? 'folder' : 'file'}: ${path}`);
  },

  async deleteFile(path: string): Promise<void> {
    const res = await fetch('/api/files/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, workspace: this.workspace }),
    });
    if (!res.ok) throw new Error(`Failed to delete: ${path}`);
  },

  async renameFile(oldPath: string, newPath: string): Promise<void> {
    const res = await fetch('/api/files/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPath, newPath, workspace: this.workspace }),
    });
    if (!res.ok) throw new Error(`Failed to rename: ${oldPath} -> ${newPath}`);
  },

  async search(query: string): Promise<{ path: string, line: number, content: string }[]> {
    const url = `/api/search?query=${encodeURIComponent(query)}${this.workspace ? `&workspace=${encodeURIComponent(this.workspace)}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Search failed');
    return res.json();
  },

  /**
   * Loads the root directory contents.
   */
  async loadRootFiles(): Promise<FileStore> {
    const files = await this.listFiles('', false);
    const store: FileStore = {};
    
    for (const file of files) {
      const isDir = file.isDir;
      const cleanPath = isDir ? file.path.slice(0, -1) : file.path;
      
      store[cleanPath] = {
        content: '', 
        isNew: false,
        isModified: false,
        size: file.size,
        isDir
      };
    }
    return store;
  },

  async loadAllFiles(): Promise<FileStore> {
    const files = await this.listFiles('', true);
    const store: FileStore = {};
    
    for (const file of files) {
      const isDir = file.isDir;
      const cleanPath = isDir ? file.path.slice(0, -1) : file.path;
      
      store[cleanPath] = {
        content: '', 
        isNew: false,
        isModified: false,
        size: file.size,
        isDir
      };
    }
    return store;
  }
};
