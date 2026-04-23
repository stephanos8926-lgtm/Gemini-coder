import { Worker } from 'node:worker_threads';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const isServer = typeof window === 'undefined';

export class PersistenceManager {
  private static instance: PersistenceManager | null = null;
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

    PersistenceManager.instance = this;
  }

  public static getInstance(): PersistenceManager {
    if (!PersistenceManager.instance) {
      // Create a default instance if none exists
      return new PersistenceManager('nexus_telemetry.db', path.join(process.cwd(), 'packages/nexus/workers/dbWorker.js'));
    }
    return PersistenceManager.instance;
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
