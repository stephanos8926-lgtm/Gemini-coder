import { Worker } from 'node:worker_threads';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const isServer = typeof window === 'undefined';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PersistenceManager {
  private worker: Worker | null = null;
  private workerPath: string;

  constructor(dbPath: string, workerPath: string) {
    this.workerPath = workerPath;

    if (!isServer) return;

    // Ensure the directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Initialize the worker
    this.worker = new Worker(this.workerPath, { 
      workerData: { dbPath }
    });

    this.worker.on('error', (err: any) => {
      console.error('[PersistenceManager] Worker Error:', err);
    });
    
    this.worker.on('exit', (code: number) => {
      if (code !== 0) {
        console.error(`[PersistenceManager] Worker stopped with exit code ${code}`);
      }
    });
  }

  public saveSensor(name: string, config: any) {
    if (!isServer || !this.worker) return;
    this.worker.postMessage({ type: 'saveSensor', name, config });
  }

  public saveSignal(signal: any, ttl: number) {
    if (!isServer || !this.worker) return;
    this.worker.postMessage({ type: 'saveSignal', signal, ttl, timestamp: Date.now() });
  }
}
