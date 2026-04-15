import { ConfigUtility } from './ConfigUtility';
import { PersistenceManager } from './PersistenceManager';
import { Sensor } from './Sensor';
import { resilienceMapper } from './ResilienceMapper';
import { ErrorBoundary } from '../security/ErrorBoundary';
import { PatchEngine } from '../security/patch-engine';
import { scanSource, scanFile } from '../security/scanner';
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
  private boundary = new ErrorBoundary();
  private patchEngine = new PatchEngine();

  private constructor(private moduleName: string) {
    this.config = new ConfigUtility({
      DB_PATH: 'logs/log_persistence.db',
      LOG_LEVEL: 'info'
    });

    const dbPath = this.config.get('DB_PATH');
    this.persistence = new PersistenceManager(dbPath);
    this.boundary.on('error', e => console.error('[ForgeGuard] Boundary Error:', JSON.stringify(e, null, 2)));
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

  public async protect<T>(fn: () => Promise<T>, ctx = {}): Promise<T> {
    try {
      return await this.boundary.capture(fn, { 
        moduleName: this.moduleName, 
        ...ctx,
        snapshot: this.getRuntimeSnapshot()
      });
    } catch (e) {
      // If an error occurs, we enrich the context with a runtime snapshot
      throw e;
    }
  }

  public getRuntimeSnapshot() {
    return {
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      cpu: process.cpuUsage(),
      timestamp: Date.now(),
      module: this.moduleName,
      activeHandles: (process as any)._getActiveHandles?.().length || 0,
      activeRequests: (process as any)._getActiveRequests?.().length || 0
    };
  }

  public async emitSignal(signal: any) {
    return this.boundary.capture(async () => {
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
        this.persistence.saveSignal(signal, 86400000);

        if (signal.priority === 'CRITICAL') {
          this.triggerSelfHealing(signal);
        }
      }
    }, { moduleName: this.moduleName, signalType: signal.type });
  }

  private triggerSelfHealing(signal: any) {
    const now = Date.now();
    if (now - this.lastHealAttempt < 60000) {
      console.log('[ForgeGuard] Self-healing debounced.');
      return;
    }
    this.lastHealAttempt = now;

    try {
      console.log('[ForgeGuard] Triggering Autonomous Patch Engine...');
      
      // If signal contains file path, scan it
      if (signal.filePath && fs.existsSync(signal.filePath)) {
        const isBackend = !signal.filePath.includes('/workspaces/');
        const issues = scanFile(signal.filePath, isBackend);
        
        this.patchEngine.generatePatches(issues).then(patches => {
          console.log(`[ForgeGuard] Scan complete: ${patches.length} issues found in ${isBackend ? 'Backend' : 'User Project'}`);
          
          let fileModified = false;
          let source = fs.readFileSync(signal.filePath, 'utf8');

          // Sort patches by start index descending to avoid offset shifting
          patches.sort((a, b) => b.issue.start - a.issue.start);

          patches.forEach(p => {
            if (p.confidence > 0.8) {
              console.log(`[ForgeGuard] Auto-applying AI patch for ${p.issue.message} at line ${p.line} (Confidence: ${p.confidence})`);
              
              const before = source.slice(0, p.issue.start);
              const after = source.slice(p.issue.end);
              source = before + p.fix + after;
              fileModified = true;
            } else {
              console.warn(`[ForgeGuard] Manual review required for ${p.issue.message} at line ${p.line} (Confidence: ${p.confidence})`);
              console.log(`[${p.issue.severity.toUpperCase()}] Proposed Fix: ${p.fix}`);
            }
          });

          if (fileModified) {
            fs.writeFileSync(signal.filePath, source, 'utf8');
            console.log(`[ForgeGuard] Successfully patched ${signal.filePath}`);
            // Emit a signal that a patch was applied
            this.emitSignal({ type: 'info', payload: { message: `Auto-patched ${signal.filePath}` }, timestamp: Date.now() });
          }
        }).catch(err => {
          console.error('[ForgeGuard] Patch generation failed:', err);
        });
      } else {
        console.warn('[ForgeGuard] No file path in signal, skipping AST scan.');
      }
    } catch (err) {
      console.error('[ForgeGuard] Failed to trigger self-healing:', err);
    }
  }

  public getStats(): TelemetryStats {
    return { ...this.stats };
  }
}

