import { LRUCache } from 'lru-cache';
import Database from 'better-sqlite3';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

export interface CacheEntry {
  userId: string;
  filePath: string;
  hash: string;
  content: string;
  updatedAt: number;
}

export class FileCacheManager {
  private static instance: FileCacheManager;
  private memoryCache: LRUCache<string, CacheEntry>;
  private db: Database.Database;

  private constructor() {
    // Tier 1: In-memory LRU Cache (e.g., max 500 files or 50MB)
    this.memoryCache = new LRUCache<string, CacheEntry>({
      max: 500,
      maxSize: 50 * 1024 * 1024, // 50MB
      sizeCalculation: (value) => value.content.length,
    });

    // Tier 2: SQLite Persistent Cache
    const dbPath = path.join(process.cwd(), 'logs', 'file_cache.db');
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS file_cache (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        filePath TEXT NOT NULL,
        hash TEXT NOT NULL,
        content TEXT NOT NULL,
        updatedAt INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_user_file ON file_cache(userId, filePath);
    `);
  }

  public static getInstance(): FileCacheManager {
    if (!FileCacheManager.instance) {
      FileCacheManager.instance = new FileCacheManager();
    }
    return FileCacheManager.instance;
  }

  private getCacheKey(userId: string, filePath: string): string {
    return `${userId}:${filePath}`;
  }

  // Fallback to blake2b512 since blake3 package failed to install native bindings
  private generateHash(content: string): string {
    return crypto.createHash('blake2b512').update(content).digest('hex');
  }

  public async getFile(userId: string, filePath: string, absolutePath: string): Promise<string> {
    const cacheKey = this.getCacheKey(userId, filePath);

    // 1. Check Tier 1 (Memory)
    const memEntry = this.memoryCache.get(cacheKey);
    if (memEntry) {
      // Fast invalidation check via fs.stat
      try {
        const stats = await fs.stat(absolutePath);
        if (stats.mtimeMs <= memEntry.updatedAt) {
          return memEntry.content;
        }
      } catch (e) {
        // File might be deleted
        this.invalidate(userId, filePath);
        throw e;
      }
    }

    // 2. Check Tier 2 (SQLite)
    const stmt = this.db.prepare('SELECT * FROM file_cache WHERE id = ?');
    const dbEntry = stmt.get(cacheKey) as CacheEntry | undefined;
    
    if (dbEntry) {
      try {
        const stats = await fs.stat(absolutePath);
        if (stats.mtimeMs <= dbEntry.updatedAt) {
          // Promote to Tier 1
          this.memoryCache.set(cacheKey, dbEntry);
          return dbEntry.content;
        }
      } catch (e) {
        this.invalidate(userId, filePath);
        throw e;
      }
    }

    // 3. Cache Miss or Invalidated - Read from disk
    const content = await fs.readFile(absolutePath, 'utf8');
    const stats = await fs.stat(absolutePath);
    const hash = this.generateHash(content);
    
    const newEntry: CacheEntry = {
      userId,
      filePath,
      hash,
      content,
      updatedAt: stats.mtimeMs
    };

    // Update Tier 1
    this.memoryCache.set(cacheKey, newEntry);

    // Update Tier 2
    const insertStmt = this.db.prepare(`
      INSERT OR REPLACE INTO file_cache (id, userId, filePath, hash, content, updatedAt)
      VALUES (@id, @userId, @filePath, @hash, @content, @updatedAt)
    `);
    insertStmt.run({
      id: cacheKey,
      ...newEntry
    });

    return content;
  }

  public async updateFile(userId: string, filePath: string, absolutePath: string, content: string): Promise<void> {
    await fs.writeFile(absolutePath, content, 'utf8');
    const stats = await fs.stat(absolutePath);
    const hash = this.generateHash(content);
    const cacheKey = this.getCacheKey(userId, filePath);

    const newEntry: CacheEntry = {
      userId,
      filePath,
      hash,
      content,
      updatedAt: stats.mtimeMs
    };

    this.memoryCache.set(cacheKey, newEntry);
    const insertStmt = this.db.prepare(`
      INSERT OR REPLACE INTO file_cache (id, userId, filePath, hash, content, updatedAt)
      VALUES (@id, @userId, @filePath, @hash, @content, @updatedAt)
    `);
    insertStmt.run({
      id: cacheKey,
      ...newEntry
    });
  }

  public invalidate(userId: string, filePath: string): void {
    const cacheKey = this.getCacheKey(userId, filePath);
    this.memoryCache.delete(cacheKey);
    const stmt = this.db.prepare('DELETE FROM file_cache WHERE id = ?');
    stmt.run(cacheKey);
  }
}
