import { Worker } from 'worker_threads';
import fs from 'fs';
import path from 'path';

const workerCode = `
  const { parentPort, workerData } = require('worker_threads');
  const Database = require('better-sqlite3');
  
  let db;
  try {
    db = new Database(workerData.dbPath);
    db.exec(\`
      CREATE TABLE IF NOT EXISTS sensor_registry (name TEXT PRIMARY KEY, config TEXT);
      CREATE TABLE IF NOT EXISTS signal_backlog (id INTEGER PRIMARY KEY AUTOINCREMENT, signal TEXT, ttl INTEGER, timestamp INTEGER);
    \`);

    const insertSensor = db.prepare('INSERT OR REPLACE INTO sensor_registry (name, config) VALUES (?, ?)');
    const insertSignal = db.prepare('INSERT INTO signal_backlog (signal, ttl, timestamp) VALUES (?, ?, ?)');

    parentPort.on('message', (msg) => {
      try {
        if (msg.type === 'saveSensor') {
          insertSensor.run(msg.name, JSON.stringify(msg.config));
        } else if (msg.type === 'saveSignal') {
          insertSignal.run(JSON.stringify(msg.signal), msg.ttl, msg.timestamp);
        }
      } catch (err) {
        console.error('[PersistenceWorker] DB Write Error:', err);
      }
    });
  } catch (err) {
    console.error('[PersistenceWorker] Initialization Error:', err);
  }
`;

export class PersistenceManager {
  private worker: Worker;

  constructor(dbPath: string) {
    // Ensure the directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Initialize the worker using eval to avoid bundler path resolution issues
    this.worker = new Worker(workerCode, { 
      eval: true,
      workerData: { dbPath }
    });

    this.worker.on('error', (err) => {
      console.error('[PersistenceManager] Worker Error:', err);
    });
    
    this.worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`[PersistenceManager] Worker stopped with exit code ${code}`);
      }
    });
  }

  public saveSensor(name: string, config: any) {
    this.worker.postMessage({ type: 'saveSensor', name, config });
  }

  public saveSignal(signal: any, ttl: number) {
    this.worker.postMessage({ type: 'saveSignal', signal, ttl, timestamp: Date.now() });
  }
}

