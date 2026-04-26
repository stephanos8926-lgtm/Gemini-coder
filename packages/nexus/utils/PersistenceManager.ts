import { get, set } from 'idb-keyval';

// Use dynamic imports to prevent Vite from bundling node modules for the browser
const isServer = typeof window === 'undefined';

export class PersistenceManager {
  private static instance: PersistenceManager | null = null;
  private worker: any = null;
  private workerPath: string;

  constructor(dbPath: string, workerPath: string) {
    this.workerPath = workerPath;

    if (isServer) {
        this.initServer(dbPath);
    } else {
        this.initClient();
    }
  }

  private async initClient() {
      // IndexedDB initialization for client
  }

  private async initServer(dbPath: string) {
    const { Worker } = await import('node:worker_threads');
    const fs = await import('node:fs');
    const path = await import('node:path');

    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

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
      PersistenceManager.instance = new PersistenceManager('nexus_telemetry.db', '/app/packages/nexus/workers/dbWorker.js');
    }
    return PersistenceManager.instance;
  }

  public async saveSensor(name: string, config: any) {
    if (isServer) {
        if (!this.worker) return;
        this.worker.postMessage({ type: 'saveSensor', name, config });
    } else {
        await set(`sensor_${name}`, config);
    }
  }

  public async saveSignal(signal: any, ttl: number) {
    if (isServer) {
        if (!this.worker) return;
        this.worker.postMessage({ type: 'saveSignal', signal, ttl, timestamp: Date.now() });
    } else {
        // Implement signal persistence for client
        await set(`signal_${Date.now()}`, { signal, ttl });
    }
  }
}
