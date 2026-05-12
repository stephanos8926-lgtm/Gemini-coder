import { parentPort, workerData } from 'node:worker_threads';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

console.log('[NexusWorker] Starting worker...', workerData.dbPath, 'Mode:', workerData.mode);

let db;
const mode = workerData.mode || 'sqlite';
const logDir = workerData.logDir || './data/telemetry/logs';

function initDb(path, retry = true) {
  if (mode === 'flat') return true;
  try {
    console.log('[NexusWorker] Opening DB:', path);
    db = new Database(path);
    db.exec(`
      CREATE TABLE IF NOT EXISTS sensor_registry (name TEXT PRIMARY KEY, config TEXT);
      CREATE TABLE IF NOT EXISTS signal_backlog (id INTEGER PRIMARY KEY AUTOINCREMENT, signal TEXT, ttl INTEGER, timestamp INTEGER);
    `);
    return true;
  } catch (err) {
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
  const insertSensor = mode === 'sqlite' ? db.prepare('INSERT OR REPLACE INTO sensor_registry (name, config) VALUES (?, ?)') : null;
  const insertSignal = mode === 'sqlite' ? db.prepare('INSERT INTO signal_backlog (signal, ttl, timestamp) VALUES (?, ?, ?)') : null;

  parentPort.on('message', (msg) => {
    console.log('[NexusWorker] Message received:', msg.type);
    try {
      if (msg.type === 'saveSensor') {
        if (mode === 'sqlite') {
          insertSensor.run(msg.name, JSON.stringify(msg.config));
        }
        // Always write to meta file for flat parity
        fs.appendFileSync(path.join(logDir, 'registry.meta'), JSON.stringify({ name: msg.name, config: msg.config, timestamp: Date.now() }) + '\n');
      } else if (msg.type === 'saveSignal') {
        const signalJson = JSON.stringify(msg.signal);
        if (mode === 'sqlite' || mode === 'both') {
          insertSignal.run(signalJson, msg.ttl, msg.timestamp);
        }
        
        // AI-Friendly Flat-File Log (JSONL)
        const dateStr = new Date().toISOString().split('T')[0];
        const logFile = path.join(logDir, `telemetry-${dateStr}.jsonl`);
        fs.appendFileSync(logFile, signalJson + '\n');
        
        // Log rotation check (simplified for now: 10MB limit)
        const stats = fs.statSync(logFile);
        if (stats.size > 10 * 1024 * 1024) {
          fs.renameSync(logFile, logFile + '.old');
        }
      }
    } catch (err) {
      console.error('[NexusWorker] Telemetry Write Error:', err);
    }
  });
} else {
  console.error('[NexusWorker] Failed to initialize DB.');
}
