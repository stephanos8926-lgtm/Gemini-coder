import { FileStore } from './fileStore';

export const filesystemService = {
  workspace: '',
  idToken: '',

  setWorkspace(name: string) {
    this.workspace = name;
  },

  setToken(token: string) {
    this.idToken = token;
  },

  async fetch(url: string, options: RequestInit = {}) {
    const headers = {
      ...options.headers,
      'Content-Type': 'application/json',
      ...(this.idToken ? { 'Authorization': `Bearer ${this.idToken}` } : {}),
    };

    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed with status ${res.status}`);
    }
    return res;
  },

  async listWorkspaces(): Promise<string[]> {
    const res = await this.fetch('/api/workspaces');
    return res.json();
  },

  async listFiles(path: string = '', recursive: boolean = false): Promise<{ path: string, isDir: boolean, size: number }[]> {
    const url = `/api/files?workspace=${encodeURIComponent(this.workspace)}&path=${encodeURIComponent(path)}&recursive=${recursive}`;
    const res = await this.fetch(url);
    return res.json();
  },

  async runTool(command: string): Promise<{ stdout: string, stderr: string, success: boolean }> {
    const res = await this.fetch('/api/tools/run', {
      method: 'POST',
      body: JSON.stringify({ command, workspace: this.workspace }),
    });
    return res.json();
  },

  async getFileContent(path: string): Promise<string> {
    const url = `/api/files/content?path=${encodeURIComponent(path)}${this.workspace ? `&workspace=${encodeURIComponent(this.workspace)}` : ''}`;
    const res = await this.fetch(url);
    const data = await res.json();
    return data.content;
  },

  async saveFile(path: string, content: string): Promise<void> {
    await this.fetch('/api/files/save', {
      method: 'POST',
      body: JSON.stringify({ path, content, workspace: this.workspace }),
    });
  },

  async createFile(path: string, isDir: boolean = false): Promise<void> {
    await this.fetch('/api/files/create', {
      method: 'POST',
      body: JSON.stringify({ path, isDir, workspace: this.workspace }),
    });
  },

  async deleteFile(path: string): Promise<void> {
    await this.fetch('/api/files/delete', {
      method: 'POST',
      body: JSON.stringify({ path, workspace: this.workspace }),
    });
  },

  async renameFile(oldPath: string, newPath: string): Promise<void> {
    await this.fetch('/api/files/rename', {
      method: 'POST',
      body: JSON.stringify({ oldPath, newPath, workspace: this.workspace }),
    });
  },

  async search(query: string): Promise<{ path: string, line: number, content: string }[]> {
    const url = `/api/search?query=${encodeURIComponent(query)}${this.workspace ? `&workspace=${encodeURIComponent(this.workspace)}` : ''}`;
    const res = await this.fetch(url);
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
