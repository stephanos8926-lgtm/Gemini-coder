import ky from 'ky';
import { FileStore } from './fileStore';
import { FileSaveSchema, FileCreateSchema } from './schemas';
import { LRUCache } from 'lru-cache';
import CryptoJS from 'crypto-js';

class TinyEmitter {
  private listeners: { [key: string]: Function[] } = {};

  on(event: string, listener: Function) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(listener);
  }

  off(event: string, listener: Function) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(l => l !== listener);
  }

  emit(event: string, data: any) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(l => l(data));
  }
}

const API_BASE = import.meta.env.VITE_API_BASE || '';

class FileCacheManager {
  private static instance: FileCacheManager;
  private l1Cache: LRUCache<string, string>;
  private userId: string = 'anonymous';

  private constructor() {
    this.l1Cache = new LRUCache<string, string>({
      max: 100,
      maxSize: 5 * 1024 * 1024,
      sizeCalculation: (value) => value.length,
      ttl: 1000 * 60 * 15,
    });
  }

  public static getInstance(): FileCacheManager {
    if (!FileCacheManager.instance) {
      FileCacheManager.instance = new FileCacheManager();
    }
    return FileCacheManager.instance;
  }

  public setUserId(uid: string) {
    this.userId = uid;
  }

  private getCacheKey(workspace: string, path: string): string {
    return `cache:${this.userId}:${workspace}:${path}`;
  }

  public async get(workspace: string, path: string): Promise<string | null> {
    const key = this.getCacheKey(workspace, path);
    const cached = this.l1Cache.get(key);
    if (cached) return cached;
    const l2Key = `l2:${key}`;
    const l2Data = localStorage.getItem(l2Key);
    if (l2Data) {
      try {
        const { content, hash } = JSON.parse(l2Data);
        const currentHash = this.calculateHash(content);
        if (currentHash === hash) {
          this.l1Cache.set(key, content);
          return content;
        }
      } catch (e) {
        localStorage.removeItem(l2Key);
      }
    }
    return null;
  }

  public set(workspace: string, path: string, content: string) {
    const key = this.getCacheKey(workspace, path);
    const hash = this.calculateHash(content);
    this.l1Cache.set(key, content);
    try {
      localStorage.setItem(`l2:${key}`, JSON.stringify({ content, hash, ts: Date.now() }));
    } catch (e) {
      this.cleanupL2();
    }
  }

  private calculateHash(content: string): string {
    return CryptoJS.SHA256(content).toString();
  }

  public invalidate(workspace: string, path: string) {
    const key = this.getCacheKey(workspace, path);
    this.l1Cache.delete(key);
    localStorage.removeItem(`l2:${key}`);
  }

  private cleanupL2() {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('l2:cache:'));
    keys.sort().slice(0, Math.floor(keys.length * 0.2)).forEach(k => localStorage.removeItem(k));
  }
}

const cacheManager = FileCacheManager.getInstance();

export class FilesystemService extends TinyEmitter {
  private static instance: FilesystemService;
  private workspace: string = '';
  private idToken: string = '';
  private _client: any = null;

  private constructor() {
    super();
  }

  public get events() {
    return this;
  }

  public static getInstance(): FilesystemService {
    if (!FilesystemService.instance) {
      FilesystemService.instance = new FilesystemService();
    }
    return FilesystemService.instance;
  }

  public setWorkspace(name: string) {
    this.workspace = name;
  }

  public setToken(token: string, uid?: string) {
    this.idToken = token;
    if (uid) cacheManager.setUserId(uid);
    this._client = null;
  }

  public get client() {
    if (!this._client) {
      this._client = ky.create({
        prefixUrl: API_BASE,
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
    }
    return this._client;
  }

  async listWorkspaces(): Promise<string[]> {
    return this.client.get('/api/workspaces').json();
  }

  async listFiles(path: string = '', recursive: boolean = false): Promise<{ path: string, isDir: boolean, size: number }[]> {
    const searchParams = new URLSearchParams({
      workspace: this.workspace,
      path,
      recursive: recursive.toString()
    });
    return this.client.get(`/api/files?${searchParams}`).json();
  }

  async runTool(command: string): Promise<{ stdout: string, stderr: string, success: boolean }> {
    return this.client.post('/api/tools/run', {
      json: { command, workspace: this.workspace },
    }).json();
  }

  async getFileContent(path: string): Promise<string> {
    const cached = await cacheManager.get(this.workspace, path);
    if (cached) return cached;
    const searchParams = new URLSearchParams({
      path,
      ...(this.workspace ? { workspace: this.workspace } : {})
    });
    const data: { content: string } = await this.client.get(`/api/files/content?${searchParams}`).json();
    cacheManager.set(this.workspace, path, data.content);
    return data.content;
  }

  async saveFile(path: string, content: string): Promise<void> {
    const body = FileSaveSchema.parse({ path, content, workspace: this.workspace });
    await this.client.post('/api/files/save', {
      json: body,
    });
    cacheManager.invalidate(this.workspace, path);
    this.emit('file-updated', { path, content });
  }

  async createFile(path: string, isDir: boolean = false): Promise<void> {
    const body = FileCreateSchema.parse({ path, isDir, workspace: this.workspace });
    await this.client.post('/api/files/create', {
      json: body,
    });
    this.emit('file-created', { path, isDir });
  }

  async deleteFile(path: string): Promise<void> {
    await this.client.post('/api/files/delete', {
      json: { path, workspace: this.workspace },
    });
    cacheManager.invalidate(this.workspace, path);
    this.emit('file-deleted', { path });
  }

  async renameFile(oldPath: string, newPath: string): Promise<void> {
    await this.client.post('/api/files/rename', {
      json: { oldPath, newPath, workspace: this.workspace },
    });
    cacheManager.invalidate(this.workspace, oldPath);
    cacheManager.invalidate(this.workspace, newPath);
    this.emit('file-renamed', { oldPath, newPath });
  }

  async search(query: string): Promise<{ path: string, line: number, content: string }[]> {
    const searchParams = new URLSearchParams({
      query,
      ...(this.workspace ? { workspace: this.workspace } : {})
    });
    return this.client.get(`/api/search?${searchParams}`).json();
  }

  async loadRootFiles(): Promise<FileStore> {
    const files = await this.listFiles('', false);
    const store: FileStore = {};
    for (const file of files) {
      const isDir = file.isDir;
      const cleanPath = (isDir && file.path.endsWith('/')) ? file.path.slice(0, -1) : file.path;
      store[cleanPath] = { content: '', isNew: false, isModified: false, size: file.size, isDir };
    }
    return store;
  }

  async loadAllFiles(): Promise<FileStore> {
    const files = await this.listFiles('', true);
    const store: FileStore = {};
    for (const file of files) {
      const isDir = file.isDir;
      const cleanPath = (isDir && file.path.endsWith('/')) ? file.path.slice(0, -1) : file.path;
      store[cleanPath] = { content: '', isNew: false, isModified: false, size: file.size, isDir };
    }
    return store;
  }
}

export const filesystemService = FilesystemService.getInstance();
