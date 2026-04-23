import { ConfigUtility } from '../utils/ConfigUtility';
import { PersistenceManager } from '../utils/PersistenceManager';
import { Sensor } from './Sensor';
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
  private stats: TelemetryStats = { totalSignals: 0, errors: 0, lastErrorAt: null };
  private protocol?: ForgeGuardProtocol;

  private constructor(private moduleName: string, configOverrides: Record<string, any>, persistence: PersistenceManager) {
    this.config = new ConfigUtility(configOverrides);
    this.persistence = persistence;
  }

  public static init(moduleName: string, configOverrides: Record<string, any> = {}, persistence?: PersistenceManager): ForgeGuard {
    if (!ForgeGuard.instances.has(moduleName)) {
      const pm = persistence || PersistenceManager.getInstance();
      ForgeGuard.instances.set(moduleName, new ForgeGuard(moduleName, configOverrides, pm));
    }
    return ForgeGuard.instances.get(moduleName)!;
  }

  public setProtocol(protocol: ForgeGuardProtocol) {
    this.protocol = protocol;
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

    if (signal.source) {
      const profile = resilienceMapper.getProfile(signal.source);
      if (profile) {
        signal.astContext = profile;
        if (profile.riskLevel === 'high') signal.priority = 'CRITICAL';
      }
    }

    let handled = false;
    for (const [name, sensor] of this.sensors.entries()) {
      try {
        const success = await sensor.handle(signal);
        if (success) handled = true;
      } catch (e) {
        console.error(`[ForgeGuard] Sensor ${name} failed to handle signal.`);
      }
    }

    if ((!handled || signal.priority === 'CRITICAL') && this.protocol) {
      this.persistence.saveSignal(signal, 86400000);
      
      if (signal.priority === 'CRITICAL' && signal.filePath) {
        // Delegate to protocol (GIDE implementation) instead of hardcoded scanFile
        await this.protocol.onDangerousIssue(signal.filePath, []); 
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
