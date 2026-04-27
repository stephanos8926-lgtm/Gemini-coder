import { ConfigUtility } from '../utils/ConfigUtility';
import { PersistenceManager } from '../utils/PersistenceManager';
import { Sensor, Signal } from './Sensor';
import { SignalTagger } from './SignalTagger';
import { ContextTagger } from './taggers/ContextTagger';
import { resilienceMapper } from './ResilienceMapper';
import { ForgeGuardProtocol } from './ForgeGuardProtocol';

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
  private taggers: SignalTagger[] = [];
  private stats: TelemetryStats = { totalSignals: 0, errors: 0, lastErrorAt: null };
  private protocol?: ForgeGuardProtocol;

  private constructor(private moduleName: string, configOverrides: Record<string, any>, persistence: PersistenceManager) {
    this.config = new ConfigUtility(configOverrides);
    this.persistence = persistence;
  }

  public static init(moduleName: string, configOverrides: Record<string, any> = {}, persistence?: PersistenceManager, protocol?: ForgeGuardProtocol): ForgeGuard {
    if (!ForgeGuard.instances.has(moduleName)) {
      const pm = persistence || PersistenceManager.getInstance();
      const guard = new ForgeGuard(moduleName, configOverrides, pm);
      if (protocol) guard.setProtocol(protocol);
      guard.registerTagger(new ContextTagger({ moduleName }));
      ForgeGuard.instances.set(moduleName, guard);
    }
    const guard = ForgeGuard.instances.get(moduleName)!;
    if (protocol) guard.setProtocol(protocol);
    return guard;
  }

  public setProtocol(protocol: ForgeGuardProtocol) {
    this.protocol = protocol;
  }

  public registerSensor(name: string, sensor: Sensor) {
    this.sensors.set(name, sensor);
    this.persistence.saveSensor(name, { registeredAt: Date.now() });
  }

  public registerTagger(tagger: SignalTagger) {
    this.taggers.push(tagger);
  }

  public async emitSignal(signal: any) {
    let s: Signal = {
      type: 'info',
      payload: signal,
      timestamp: Date.now(),
      ...signal
    };

    // Apply Taggers
    for (const tagger of this.taggers) {
      s = tagger.tag(s);
    }

    this.stats.totalSignals++;
    if (s.type === 'error') {
      this.stats.errors++;
      this.stats.lastErrorAt = Date.now();
    }

    if (s.source) {
      const profile = resilienceMapper.getProfile(s.source);
      if (profile) {
        s.context = { ...s.context, astContext: profile };
        if (profile.riskLevel === 'high') s.priority = 'CRITICAL';
      }
    }

    let handled = false;
    for (const [name, sensor] of this.sensors.entries()) {
      try {
        const success = await sensor.handle(s);
        if (success) handled = true;
      } catch (e) {
        console.error(`[ForgeGuard] Sensor ${name} failed to handle signal.`);
      }
    }

    if ((!handled || s.priority === 'CRITICAL') && this.protocol) {
      this.persistence.saveSignal(s, 86400000);
      
      if (s.priority === 'CRITICAL' && (s.payload as any)?.filePath) {
        // Delegate to protocol (GIDE implementation) instead of hardcoded scanFile
        await this.protocol.onDangerousIssue((s.payload as any).filePath, []); 
      }
    }
  }

  /**
   * @method protect
   * @description Automated error wrapping primitive. Executes the provided function within a protective barrier,
   * emitting telemetry signals upon detecting failures.
   */
  public async protect<T>(fn: () => Promise<T> | T, context?: any): Promise<T> {
    try {
      const result = fn();
      if (result instanceof Promise) {
        return await result;
      }
      return result;
    } catch (error) {
      await this.emitSignal({
        type: 'error',
        payload: error instanceof Error ? { message: error.message, stack: error.stack } : error,
        timestamp: Date.now(),
        context
      });
      throw error;
    }
  }

  public getStats(): TelemetryStats {
    return { ...this.stats };
  }
}
