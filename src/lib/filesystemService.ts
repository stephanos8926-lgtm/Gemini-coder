import ky from 'ky';
import { FileStore } from './fileStore';
import { FileSaveSchema, FileCreateSchema } from './schemas';

export const filesystemService = {
  workspace: '',
  idToken: '',

  setWorkspace(name: string) {
    this.workspace = name;
  },

  setToken(token: string) {
    this.idToken = token;
  },

  get client() {
    return ky.create({
      headers: {
        'Content-Type': 'application/json',
        ...(this.idToken ? { 'Authorization': `Bearer ${this.idToken}` } : {}),
      },
      hooks: {
        afterResponse: [
          async (_request, _options, response) => {
            if (!response.ok) {
              const errorData = (await response.json().catch(() => ({}))) as { error?: string };
              throw new Error(errorData.error || `Request failed with status ${response.status}`);
            }
          }
        ]
      }
    });
  },

  async listWorkspaces(): Promise<string[]> {
    return this.client.get('/api/workspaces').json();
  },

  async listFiles(path: string = '', recursive: boolean = false): Promise<{ path: string, isDir: boolean, size: number }[]> {
    const searchParams = new URLSearchParams({
      workspace: this.workspace,
      path,
      recursive: recursive.toString()
    });
    return this.client.get(`/api/files?${searchParams}`).json();
  },

  async runTool(command: string): Promise<{ stdout: string, stderr: string, success: boolean }> {
    return this.client.post('/api/tools/run', {
      json: { command, workspace: this.workspace },
    }).json();
  },

  async getFileContent(path: string): Promise<string> {
    const searchParams = new URLSearchParams({
      path,
      ...(this.workspace ? { workspace: this.workspace } : {})
    });
    const data: { content: string } = await this.client.get(`/api/files/content?${searchParams}`).json();
    return data.content;
  },

  async saveFile(path: string, content: string): Promise<void> {
    const body = FileSaveSchema.parse({ path, content, workspace: this.workspace });
    await this.client.post('/api/files/save', {
      json: body,
    });
  },

  async createFile(path: string, isDir: boolean = false): Promise<void> {
    const body = FileCreateSchema.parse({ path, isDir, workspace: this.workspace });
    await this.client.post('/api/files/create', {
      json: body,
    });
  },

  async deleteFile(path: string): Promise<void> {
    await this.client.post('/api/files/delete', {
      json: { path, workspace: this.workspace },
    });
  },

  async renameFile(oldPath: string, newPath: string): Promise<void> {
    await this.client.post('/api/files/rename', {
      json: { oldPath, newPath, workspace: this.workspace },
    });
  },

  async search(query: string): Promise<{ path: string, line: number, content: string }[]> {
    const searchParams = new URLSearchParams({
      query,
      ...(this.workspace ? { workspace: this.workspace } : {})
    });
    return this.client.get(`/api/search?${searchParams}`).json();
  },

  /**
   * Loads the root directory contents.
   */
  async loadRootFiles(): Promise<FileStore> {
    const files = await this.listFiles('', false);
    const store: FileStore = {};
    
    for (const file of files) {
      const isDir = file.isDir;
      const cleanPath = (isDir && file.path.endsWith('/')) ? file.path.slice(0, -1) : file.path;
      
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
      const cleanPath = (isDir && file.path.endsWith('/')) ? file.path.slice(0, -1) : file.path;
      
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
