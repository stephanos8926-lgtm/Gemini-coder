import { ForgeGuard } from '../utils/ForgeGuard';
import { logRedirector } from '../utils/LogRedirector';

export interface ProfileSnapshot {
  timestamp: number;
  memory: NodeJS.MemoryUsage;
  cpu: NodeJS.CpuUsage;
  activeHandles: number;
  activeRequests: number;
  eventLoopDelay: number;
}

/**
 * Deep Profiling Integration
 * Feeds actual CPU/Memory profiling data into the AI to identify performance bottlenecks.
 */
export class DeepProfiler {
  private static instance: DeepProfiler;
  private guard = ForgeGuard.init('deep-profiler');
  private snapshots: ProfileSnapshot[] = [];
  private readonly MAX_SNAPSHOTS = 100;
  private intervalId: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): DeepProfiler {
    if (!DeepProfiler.instance) {
      DeepProfiler.instance = new DeepProfiler();
    }
    return DeepProfiler.instance;
  }

  public start(intervalMs: number = 5000) {
    if (this.intervalId) return;

    this.intervalId = setInterval(async () => {
      await this.takeSnapshot();
    }, intervalMs);

    logRedirector.push('system', 'info', `Deep Profiler started with ${intervalMs}ms interval.`);
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logRedirector.push('system', 'info', 'Deep Profiler stopped.');
    }
  }

  private async takeSnapshot(): Promise<void> {
    await this.guard.protect(async () => {
      const start = Date.now();
      
      // Measure event loop delay
      const delay = await new Promise<number>((resolve) => {
        const s = Date.now();
        setImmediate(() => resolve(Date.now() - s));
      });

      const snapshot: ProfileSnapshot = {
        timestamp: Date.now(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        activeHandles: (process as any)._getActiveHandles?.().length || 0,
        activeRequests: (process as any)._getActiveRequests?.().length || 0,
        eventLoopDelay: delay
      };

      this.snapshots.push(snapshot);
      if (this.snapshots.length > this.MAX_SNAPSHOTS) {
        this.snapshots.shift();
      }

      // If event loop delay is high, log a warning
      if (delay > 50) {
        logRedirector.push('system', 'warn', `High event loop delay detected: ${delay}ms. Potential performance bottleneck.`);
      }
    });
  }

  public getSnapshots(): ProfileSnapshot[] {
    return this.snapshots;
  }

  public getLatestSnapshot(): ProfileSnapshot | null {
    return this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1] : null;
  }
}

export const deepProfiler = DeepProfiler.getInstance();
