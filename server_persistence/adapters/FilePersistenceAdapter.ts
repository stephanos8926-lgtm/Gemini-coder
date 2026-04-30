import { IPersistenceAdapter } from '../../src/lib/persistence/types';

/**
 * FilePersistenceAdapter
 * Server-side local persistence using the filesystem.
 */
export class FilePersistenceAdapter implements IPersistenceAdapter {
  private storagePath: string;

  constructor(private fileName: string = 'nexus_storage.json') {
    this.storagePath = '';
  }

  private async getStoragePath() {
    if (!this.storagePath) {
      const path = await import('path');
      this.storagePath = path.join(process.cwd(), 'data', 'persistence', this.fileName);
    }
    return this.storagePath;
  }

  private async getFs() {
    return import('fs/promises');
  }

  private async ensureDir() {
    const fs = await this.getFs();
    const path = await import('path');
    const storagePath = await this.getStoragePath();
    await fs.mkdir(path.dirname(storagePath), { recursive: true });
  }

  private async readData(): Promise<Record<string, any>> {
    const fs = await this.getFs();
    const storagePath = await this.getStoragePath();
    try {
      const data = await fs.readFile(storagePath, 'utf8');
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
    const fs = await this.getFs();
    const storagePath = await this.getStoragePath();
    await this.ensureDir();
    const data = await this.readData();
    data[key] = value;
    await fs.writeFile(storagePath, JSON.stringify(data, null, 2));
  }

  public async delete(key: string): Promise<void> {
    const fs = await this.getFs();
    const storagePath = await this.getStoragePath();
    const data = await this.readData();
    delete data[key];
    await fs.writeFile(storagePath, JSON.stringify(data, null, 2));
  }

  public async clear(): Promise<void> {
    const fs = await this.getFs();
    const storagePath = await this.getStoragePath();
    await fs.writeFile(storagePath, JSON.stringify({}));
  }
}
