import { LRUCache} from 'lru-cache';
import lz4 from 'lz4js';
import fnv from 'fnv-plus';
import fs from 'fs';

let Database: any = null;
if (typeof window === 'undefined') {
  Database = require('better-sqlite3');
}

export class FileCacheManager {
  private static instance: FileCacheManager;
  private l1Cache: LRUCache<string, string>;
  private db: any = null;
  private dbPath = 'file_cache.db';

  private constructor() {
    this.l1Cache = new LRUCache<string, string>({
      max: 100, // Tier 1: In-memory
      ttl: 1000 * 60 * 15,
    });
    
    if (Database) {
        try {
            this.db = new Database(this.dbPath);
        } catch (e: any) {
            console.error('[FileCacheManager] Failed to open database, potentially corrupt. Attempting recovery...', e);
            if (fs.existsSync(this.dbPath)) {
                fs.unlinkSync(this.dbPath);
                console.log('[FileCacheManager] Corrupt database deleted.');
            }
            this.db = new Database(this.dbPath);
        }

        this.db.exec(`
          CREATE TABLE IF NOT EXISTS file_cache (
            userId TEXT,
            filePath TEXT,
            content BLOB,
            hash TEXT,
            updatedAt INTEGER,
            PRIMARY KEY (userId, filePath)
          )
        `);
    }
  }

  public static getInstance(): FileCacheManager {
    if (!FileCacheManager.instance) {
      FileCacheManager.instance = new FileCacheManager();
    }
    return FileCacheManager.instance;
  }

  private calculateHash(content: string): string {
    return fnv.hash(content).hex();
  }

  private compress(content: string): Buffer {
    const input = Buffer.from(content, 'utf-8');
    const compressed = lz4.compress(input);
    return Buffer.from(compressed);
  }

  private decompress(data: Buffer): string {
    const decompressed = lz4.decompress(data);
    return Buffer.from(decompressed).toString('utf-8');
  }

  public async getFile(userId: string, filePath: string, _fullPath?: string): Promise<string | null> {
    const key = `${userId}:${filePath}`;
    const cached = this.l1Cache.get(key);
    if (cached) return cached;

    if (this.db) {
        const row = this.db.prepare('SELECT content, hash, updatedAt FROM file_cache WHERE userId = ? AND filePath = ?').get(userId, filePath) as any;
        if (row) {
            const content = this.decompress(row.content);
            this.l1Cache.set(key, content);
            return content;
        }
    }
    return null;
  }

  public async setFile(userId: string, filePath: string, content: string, _fullPath?: string): Promise<void> {
    const key = `${userId}:${filePath}`;
    const hash = this.calculateHash(content);
    
    this.l1Cache.set(key, content);
    
    if (this.db) {
        const compressed = this.compress(content);
        const stmt = this.db.prepare('INSERT OR REPLACE INTO file_cache (userId, filePath, content, hash, updatedAt) VALUES (?, ?, ?, ?, ?)');
        stmt.run(userId, filePath, compressed, hash, Date.now());
    }
  }

  /**
   * @method updateFile
   * @description Alias for setFile to maintain backward compatibility with legacy GIDE server endpoints.
   */
  public async updateFile(userId: string, filePath: string, fullPath: string, content: string): Promise<void> {
    return this.setFile(userId, filePath, content);
  }

  public invalidate(userId: string, filePath: string): void {
     this.l1Cache.delete(`${userId}:${filePath}`);
     if (this.db) {
         this.db.prepare('DELETE FROM file_cache WHERE userId = ? AND filePath = ?').run(userId, filePath);
     }
  }
}
export const fileCache = FileCacheManager.getInstance();
