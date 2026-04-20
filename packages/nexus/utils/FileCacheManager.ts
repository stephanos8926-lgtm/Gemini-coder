import fs from 'fs/promises';
import path from 'path';

export class FileCacheManager {
  private static instance: FileCacheManager;
  private cache: Map<string, { content: string; updatedAt: number }> = new Map();

  private constructor() {}

  public static getInstance(): FileCacheManager {
    if (!FileCacheManager.instance) {
      FileCacheManager.instance = new FileCacheManager();
    }
    return FileCacheManager.instance;
  }

  public async getFile(absolutePath: string): Promise<string | null> {
    const stats = await fs.stat(absolutePath);
    const cached = this.cache.get(absolutePath);
    if (cached && stats.mtimeMs <= cached.updatedAt) {
      return cached.content;
    }
    return null;
  }

  public async setFile(absolutePath: string, content: string): Promise<void> {
    const stats = await fs.stat(absolutePath);
    this.cache.set(absolutePath, {
      content,
      updatedAt: stats.mtimeMs
    });
  }

  public invalidate(absolutePath: string): void {
    this.cache.delete(absolutePath);
  }
}
export const fileCache = FileCacheManager.getInstance();
