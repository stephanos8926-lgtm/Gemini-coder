import fs from 'fs/promises';
import path from 'path';
import { IPersistenceAdapter } from '../types';

/**
 * FilePersistenceAdapter
 * Server-side local persistence using the filesystem.
 */
export class FilePersistenceAdapter implements IPersistenceAdapter {
  private storagePath: string;

  constructor(fileName: string = 'nexus_storage.json') {
    this.storagePath = path.join(process.cwd(), '.docs', 'persistence', fileName);
  }

  private async ensureDir() {
    await fs.mkdir(path.dirname(this.storagePath), { recursive: true });
  }

  private async readData(): Promise<Record<string, any>> {
    try {
      const data = await fs.readFile(this.storagePath, 'utf8');
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  public async get<T>(key: string): Promise<T | null> {
    const data = await this.readData();
    return data[key] ?? null;
  }

  public async set<T>(key: string, value: T): Promise<void> {
    await this.ensureDir();
    const data = await this.readData();
    data[key] = value;
    await fs.writeFile(this.storagePath, JSON.stringify(data, null, 2));
  }

  public async delete(key: string): Promise<void> {
    const data = await this.readData();
    delete data[key];
    await fs.writeFile(this.storagePath, JSON.stringify(data, null, 2));
  }

  public async clear(): Promise<void> {
    await fs.writeFile(this.storagePath, JSON.stringify({}));
  }
}
