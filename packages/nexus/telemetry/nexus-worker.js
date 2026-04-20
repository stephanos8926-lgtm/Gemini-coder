import { parentPort, workerData } from 'node:worker_threads';
import Database from 'better-sqlite3';
import fs from 'node:fs';

console.log('[NexusWorker] Starting worker...', workerData.dbPath);

let db: any;
function initDb(path: string, retry = true): boolean {
  try {
    console.log('[NexusWorker] Opening DB:', path);
    db = new Database(path);
    console.log('[NexusWorker] DB Opened successfully.');
    db.exec(`
      CREATE TABLE IF NOT EXISTS sensor_registry (name TEXT PRIMARY KEY, config TEXT);
      CREATE TABLE IF NOT EXISTS signal_backlog (id INTEGER PRIMARY KEY AUTOINCREMENT, signal TEXT, ttl INTEGER, timestamp INTEGER);
    `);
    console.log('[NexusWorker] DB Schema initialized.');
    return true;
  } catch (err: any) {
    console.error('[NexusWorker] Database Error:', err);
    if (retry && err.code === 'SQLITE_CORRUPT') {
      console.warn('[NexusWorker] Corrupt DB detected, attempting recovery...', path);
      try {
        if (db) db.close();
        fs.unlinkSync(path);
        return initDb(path, false);
      } catch (unlinkErr) {
        console.error('[NexusWorker] Failed to delete corrupt DB:', unlinkErr);
      }
    }
    console.error('[NexusWorker] Initialization Error:', err);
    return false;
  }
}

if (initDb(workerData.dbPath)) {
  const insertSensor = db.prepare('INSERT OR REPLACE INTO sensor_registry (name, config) VALUES (?, ?)');
  const insertSignal = db.prepare('INSERT INTO signal_backlog (signal, ttl, timestamp) VALUES (?, ?, ?)');

  parentPort!.on('message', (msg: any) => {
    console.log('[NexusWorker] Message received:', msg.type);
    try {
      if (msg.type === 'saveSensor') {
        insertSensor.run(msg.name, JSON.stringify(msg.config));
      } else if (msg.type === 'saveSignal') {
        insertSignal.run(JSON.stringify(msg.signal), msg.ttl, msg.timestamp);
      }
    } catch (err) {
      console.error('[NexusWorker] DB Write Error:', err);
    }
  });
} else {
  console.error('[NexusWorker] Failed to initialize DB.');
}
