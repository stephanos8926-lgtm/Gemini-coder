export interface Signal {
  type: 'error' | 'warn' | 'info';
  payload: unknown;
  timestamp: number;
  source?: string;
  context?: Record<string, unknown>;
  priority?: 'NORMAL' | 'CRITICAL';
}

/**
 * Enhanced Sensor interface with capability detection
 */
export interface Sensor {
  readonly name: string;
  readonly capabilities: string[];
  handle(signal: Signal): Promise<boolean>;
}
