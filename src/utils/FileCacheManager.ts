import { LRUCache } from 'lru-cache';
import Database from 'better-sqlite3';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface CacheEntry {
  userId: string;
  filePath: string;
  hash: string;
  content: string;
  updatedAt: number;
}

/**
 * FileCacheManager (App Tier)
 * Re-established at the application level to ensure full observability and
 * integration with build mode telemetry.
 */
export class FileCacheManager {
  private static instance: FileCacheManager;
  private memoryCache: LRUCache<string, CacheEntry>;
  private db: Database.Database | null = null;

  private constructor() {
    // Tier 1: In-memory LRU Cache (max 500 files or 50MB)
    this.memoryCache = new LRUCache<string, CacheEntry>({
      max: 500,
      maxSize: 50 * 1024 * 1024,
      sizeCalculation: (value) => value.content.length,
    });

    // Tier 2: SQLite Persistent Cache
    const logsDir = path.join(process.cwd(), 'logs');
    const dbPath = path.join(logsDir, 'file_cache.db');
    
    // Ensure logs directory exists
    if (!fs.existsSync(logsDir)) {
      try {
        fs.mkdirSync(logsDir, { recursive: true });
      } catch (err) {
        console.error('[FileCacheManager] Failed to create logs directory:', err);
      }
    }

    const initDb = (loc: string) => {
      const sqlite = new Database(loc, { timeout: 5000 });
      sqlite.pragma('journal_mode = WAL');
      sqlite.pragma('synchronous = NORMAL');
      sqlite.exec(`
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
      return sqlite;
    };

    try {
      this.db = initDb(dbPath);
      console.log('[FileCacheManager] Persistent cache initialized.');
    } catch (e) {
      console.error('[FileCacheManager] Initialization failed. Attempting recovery...', e);
      
      try {
        // Unlink potentially corrupt files
        const filesToDelete = [dbPath, `${dbPath}-wal`, `${dbPath}-shm`];
        filesToDelete.forEach(f => {
          if (fs.existsSync(f)) {
            try { fs.unlinkSync(f); } catch {}
          }
        });
        
        this.db = initDb(dbPath);
        console.log('[FileCacheManager] Persistent cache recovered.');
      } catch (retryErr) {
        console.error('[FileCacheManager] Critical failure: Fallback to in-memory.', retryErr);
        try {
          this.db = initDb(':memory:');
        } catch (memErr) {
          console.error('[FileCacheManager] Total failure: SQLite disabled.', memErr);
          this.db = null;
        }
      }
    }
  }

  public static getInstance(): FileCacheManager {
    if (!FileCacheManager.instance) {
      FileCacheManager.instance = new FileCacheManager();
    }
    return FileCacheManager.instance;
  }

  private generateHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private getCacheKey(userId: string, filePath: string): string {
    return `${userId}:${filePath}`;
  }

  public async getFile(userId: string, filePath: string, absolutePath: string): Promise<string> {
    const cacheKey = this.getCacheKey(userId, filePath);

    // 1. Memory Check
    const memEntry = this.memoryCache.get(cacheKey);
    if (memEntry) {
      return memEntry.content;
    }

    // 2. Database Check
    if (this.db) {
      try {
        const row = this.db.prepare('SELECT * FROM file_cache WHERE id = ?').get(cacheKey) as any;
        if (row) {
          this.memoryCache.set(cacheKey, {
            userId: row.userId,
            filePath: row.filePath,
            hash: row.hash,
            content: row.content,
            updatedAt: row.updatedAt
          });
          return row.content;
        }
      } catch (e) {
        console.error('[FileCacheManager] Database read failed.', e);
      }
    }

    // 3. Disk Read (Source of Truth)
    const content = await fs.promises.readFile(absolutePath, 'utf8');
    const stats = await fs.promises.stat(absolutePath);
    const hash = this.generateHash(content);

    const entry: CacheEntry = {
      userId,
      filePath,
      hash,
      content,
      updatedAt: stats.mtimeMs
    };

    this.memoryCache.set(cacheKey, entry);
    if (this.db) {
      try {
        this.db.prepare(`
          INSERT OR REPLACE INTO file_cache (id, userId, filePath, hash, content, updatedAt)
          VALUES (@id, @userId, @filePath, @hash, @content, @updatedAt)
        `).run({ id: cacheKey, ...entry });
      } catch (e) {
        console.error('[FileCacheManager] Database write failed.', e);
      }
    }

    return content;
  }

  public async updateFile(userId: string, filePath: string, absolutePath: string, content: string): Promise<void> {
    await fs.promises.writeFile(absolutePath, content, 'utf8');
    const stats = await fs.promises.stat(absolutePath);
    const hash = this.generateHash(content);
    const cacheKey = this.getCacheKey(userId, filePath);

    const entry: CacheEntry = { userId, filePath, hash, content, updatedAt: stats.mtimeMs };

    this.memoryCache.set(cacheKey, entry);
    if (this.db) {
      try {
        this.db.prepare(`
          INSERT OR REPLACE INTO file_cache (id, userId, filePath, hash, content, updatedAt)
          VALUES (@id, @userId, @filePath, @hash, @content, @updatedAt)
        `).run({ id: cacheKey, ...entry });
      } catch (e) {
        console.error('[FileCacheManager] Database update failed.', e);
      }
    }
  }

  public invalidate(userId: string, filePath: string): void {
    const cacheKey = this.getCacheKey(userId, filePath);
    this.memoryCache.delete(cacheKey);
    if (this.db) {
      try {
        this.db.prepare('DELETE FROM file_cache WHERE id = ?').run(cacheKey);
      } catch (e) {
        console.error('[FileCacheManager] Database delete failed.', e);
      }
    }
  }
}

export const fileCache = FileCacheManager.getInstance();
