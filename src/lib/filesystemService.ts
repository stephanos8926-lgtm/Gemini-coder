import { ForgeGuard } from '../../packages/nexus/guard/ForgeGuard';
import ky from 'ky';
import { FileStore } from './fileStore';
import { FileSaveSchema, FileCreateSchema } from './schemas';
import { LRUCache } from 'lru-cache';
import CryptoJS from 'crypto-js';
import path from 'path';

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

import { fileCache } from '../utils/FileCacheManager';
import { get, set, del } from 'idb-keyval';

class FileCacheManager {
  private static instance: FileCacheManager;
  private userId: string = 'anonymous';

  private constructor() {}

  public static getInstance(): FileCacheManager {
    if (!FileCacheManager.instance) {
      FileCacheManager.instance = new FileCacheManager();
    }
    return FileCacheManager.instance;
  }

  public setUserId(uid: string) {
    this.userId = uid;
  }

  public async get(workspace: string, filePath: string): Promise<string | null> {
    const key = `${this.userId}:${workspace}:${filePath}`;
    const absolutePath = path.join(process.cwd(), workspace, filePath);
    
    // Tier 1/2: App Cache
    try {
      const cached = await fileCache.getFile(this.userId, `${workspace}:${filePath}`, absolutePath);
      if (cached) return cached;
    } catch (e) {
      console.warn('[Cache] App tier get failed', e);
    }

    // Tier 3: Client-Side IndexedDB (Local Recovery)
    try {
      const idbContent = await get(key);
      if (idbContent) {
        // Backfill Tier 1/2
        const absolutePath = path.join(process.cwd(), workspace, filePath);
        await fileCache.updateFile(this.userId, `${workspace}:${filePath}`, absolutePath, idbContent);
        return idbContent;
      }
    } catch (e) {
      console.warn('[L3 Cache] idb-get failed', e);
    }

    return null;
  }

  public async set(workspace: string, filePath: string, content: string) {
    const key = `${this.userId}:${workspace}:${filePath}`;
    const absolutePath = path.join(process.cwd(), workspace, filePath);
    
    // Tier 1/2: App Cache
    await fileCache.updateFile(this.userId, `${workspace}:${filePath}`, absolutePath, content);
    
    // Tier 3: Client-Side IndexedDB
    try {
      await set(key, content);
    } catch (e) {
      console.warn('[L3 Cache] idb-set failed', e);
    }
  }

  public async invalidate(workspace: string, path: string) {
    const key = `${this.userId}:${workspace}:${path}`;
    fileCache.invalidate(this.userId, `${workspace}:${path}`);
    try {
      await del(key);
    } catch (e) {
      console.warn('[L3 Cache] idb-del failed', e);
    }
  }
}

const cacheManager = FileCacheManager.getInstance();

export class FilesystemService extends TinyEmitter {
  private static instance: FilesystemService;
  private workspace: string = '';
  private idToken: string = '';
  private _client: any = null;
  private guard: ForgeGuard;

  private constructor() {
    super();
    this.guard = ForgeGuard.init('FilesystemService');
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
    return this.guard.protect(() => this.client.get('/api/workspaces').json(), { method: 'listWorkspaces' });
  }

  async listFiles(path: string = '', recursive: boolean = false): Promise<{ path: string, isDir: boolean, size: number }[]> {
    return this.guard.protect(() => {
        const searchParams = new URLSearchParams({
          workspace: this.workspace,
          path,
          recursive: recursive.toString()
        });
        return this.client.get(`/api/files?${searchParams}`).json();
    }, { method: 'listFiles', path });
  }

  async runTool(command: string): Promise<{ stdout: string, stderr: string, success: boolean }> {
    return this.guard.protect(() => this.client.post('/api/tools/run', {
      json: { command, workspace: this.workspace },
    }).json(), { method: 'runTool', command });
  }

  async getFileContent(path: string): Promise<string> {
    return this.guard.protect(async () => {
        const cached = await cacheManager.get(this.workspace, path);
        if (cached) return cached;
        const searchParams = new URLSearchParams({
          path,
          ...(this.workspace ? { workspace: this.workspace } : {})
        });
        const data: { content: string } = await this.client.get(`/api/files/content?${searchParams}`).json();
        cacheManager.set(this.workspace, path, data.content);
        return data.content;
    }, { method: 'getFileContent', path });
  }

  async saveFile(path: string, content: string): Promise<void> {
    return this.guard.protect(async () => {
        const body = FileSaveSchema.parse({ path, content, workspace: this.workspace });
        await this.client.post('/api/files/save', {
          json: body,
        });
        cacheManager.invalidate(this.workspace, path);
        this.emit('file-updated', { path, content });
    }, { method: 'saveFile', path });
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

  async getRelevantContext(query: string, limit: number = 5, skillContext?: any): Promise<{ path: string, content: string }[]> {
    return (this.client.post('/api/context/relevant', {
      json: { query, limit, skillContext }
    }).json() as Promise<any>).then((data: any) => data.results);
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
