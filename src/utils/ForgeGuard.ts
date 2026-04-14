import { ConfigUtility } from './ConfigUtility';
import { PersistenceManager } from './PersistenceManager';
import { Sensor } from './Sensor';
import { resilienceMapper } from './ResilienceMapper';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export interface TelemetryStats {
  totalSignals: number;
  errors: number;
  lastErrorAt: number | null;
}

export class ForgeGuard {
  private static instances: Map<string, ForgeGuard> = new Map();
  public config: ConfigUtility;
  public persistence: PersistenceManager;
  private sensors: Map<string, Sensor> = new Map();
  private stats: TelemetryStats = { totalSignals: 0, errors: 0, lastErrorAt: null };
  private lastHealAttempt: number = 0;

  private constructor(private moduleName: string) {
    this.config = new ConfigUtility({
      DB_PATH: 'logs/log_persistence.db',
      LOG_LEVEL: 'info'
    });

    const dbPath = this.config.get('DB_PATH');
    this.persistence = new PersistenceManager(dbPath);
  }

  public static init(moduleName: string): ForgeGuard {
    if (!ForgeGuard.instances.has(moduleName)) {
      ForgeGuard.instances.set(moduleName, new ForgeGuard(moduleName));
    }
    return ForgeGuard.instances.get(moduleName)!;
  }

  public registerSensor(name: string, sensor: Sensor) {
    this.sensors.set(name, sensor);
    this.persistence.saveSensor(name, { registeredAt: Date.now() });
  }

  public async emitSignal(signal: any) {
    this.stats.totalSignals++;
    if (signal.type === 'error') {
      this.stats.errors++;
      this.stats.lastErrorAt = Date.now();
    }

    // 1. AST Enrichment (Zero-latency lookup)
    if (signal.source) {
      const profile = resilienceMapper.getProfile(signal.source);
      if (profile) {
        signal.astContext = profile;
        // Intelligent routing based on risk
        if (profile.riskLevel === 'high') {
          signal.priority = 'CRITICAL';
        }
      }
    }

    // 2. Advanced Routing with Backpressure
    let handled = false;
    for (const [name, sensor] of this.sensors.entries()) {
      try {
        const success = await sensor.handle(signal);
        if (success) handled = true;
      } catch (e) {
        console.error(`[ForgeGuard] Sensor ${name} failed to handle signal.`);
      }
    }

    // 3. Backlog Management & Autonomous Self-Healing
    if (!handled || signal.priority === 'CRITICAL') {
      // Save to SQLite backlog with a TTL (e.g., 24 hours)
      this.persistence.saveSignal(signal, 86400000);

      // Trigger Autonomous Self-Healing for CRITICAL errors
      if (signal.priority === 'CRITICAL') {
        this.triggerSelfHealing(signal);
      }
    }
  }

  private triggerSelfHealing(signal: any) {
    const now = Date.now();
    // Debounce: Max 1 heal attempt every 60 seconds to prevent infinite loops
    if (now - this.lastHealAttempt < 60000) {
      console.log('[ForgeGuard] Self-healing debounced.');
      return;
    }
    this.lastHealAttempt = now;

    try {
      const logDir = path.join(process.cwd(), 'logs');
      if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
      
      const errorLogPath = path.join(logDir, 'latest_critical_error.json');
      fs.writeFileSync(errorLogPath, JSON.stringify(signal, null, 2));

      console.log('[ForgeGuard] Triggering Autonomous Patch Engine...');
      const patchEnginePath = path.join(process.cwd(), 'patch-engine', 'dist', 'heal.js');
      
      const child = spawn('node', [patchEnginePath, errorLogPath], {
        stdio: 'inherit',
        detached: true // Run independently
      });
      
      child.unref();
    } catch (err) {
      console.error('[ForgeGuard] Failed to trigger self-healing:', err);
    }
  }

  public getStats(): TelemetryStats {
    return { ...this.stats };
  }
}

