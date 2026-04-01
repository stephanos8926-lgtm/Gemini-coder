import { FileStore } from './fileStore';

export const filesystemService = {
  async listFiles(): Promise<string[]> {
    const res = await fetch('/api/files');
    if (!res.ok) throw new Error('Failed to list files');
    return res.json();
  },

  async getFileContent(path: string): Promise<string> {
    const res = await fetch(`/api/files/content?path=${encodeURIComponent(path)}`);
    if (!res.ok) throw new Error(`Failed to read file: ${path}`);
    const data = await res.json();
    return data.content;
  },

  async saveFile(path: string, content: string): Promise<void> {
    const res = await fetch('/api/files/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content }),
    });
    if (!res.ok) throw new Error(`Failed to save file: ${path}`);
  },

  async createFile(path: string, isDir: boolean = false): Promise<void> {
    const res = await fetch('/api/files/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, isDir }),
    });
    if (!res.ok) throw new Error(`Failed to create ${isDir ? 'folder' : 'file'}: ${path}`);
  },

  async deleteFile(path: string): Promise<void> {
    const res = await fetch('/api/files/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    if (!res.ok) throw new Error(`Failed to delete: ${path}`);
  },

  async renameFile(oldPath: string, newPath: string): Promise<void> {
    const res = await fetch('/api/files/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPath, newPath }),
    });
    if (!res.ok) throw new Error(`Failed to rename: ${oldPath} -> ${newPath}`);
  },

  /**
   * Loads all files from the backend into a FileStore object.
   * This is useful for initializing the app.
   */
  async loadAllFiles(): Promise<FileStore> {
    const filePaths = await this.listFiles();
    const store: FileStore = {};
    
    // We only load content for non-directories
    // Actually, to avoid a massive burst of requests, we might want to load content lazily.
    // But for now, let's just load the structure.
    for (const path of filePaths) {
      const isDir = path.endsWith('/');
      const cleanPath = isDir ? path.slice(0, -1) : path;
      
      store[cleanPath] = {
        content: '', // Load lazily or on demand
        isNew: false,
        isModified: false,
        size: 0,
        isDir
      };
    }
    return store;
  }
};
