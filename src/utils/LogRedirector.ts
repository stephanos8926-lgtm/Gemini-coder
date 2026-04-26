import { EventEmitter } from 'events';

export type LogSource = 'build' | 'execution' | 'system';

export interface LogEntry {
  timestamp: number;
  source: LogSource;
  level: 'info' | 'warn' | 'error';
  message: string;
  id: string;
}

class LogRedirector extends EventEmitter {
  private static instance: LogRedirector;
  private logs: LogEntry[] = [];
  private readonly MAX_LOGS = 1000;

  private constructor() {
    super();
  }

  public static getInstance(): LogRedirector {
    if (!LogRedirector.instance) {
      LogRedirector.instance = new LogRedirector();
    }
    return LogRedirector.instance;
  }

  public push(source: LogSource, level: LogEntry['level'], message: string) {
    const now = Date.now();
    const entry: LogEntry = {
      timestamp: now,
      source,
      level,
      message,
      id: Math.random().toString(36).substring(7)
    };

    this.logs.push(entry);
    
    // Prune logs older than 1 hour or exceed MAX_LOGS
    const ONE_HOUR = 60 * 60 * 1000;
    this.logs = this.logs.filter(l => (now - l.timestamp) < ONE_HOUR);
    if (this.logs.length > this.MAX_LOGS) {
      this.logs = this.logs.slice(-this.MAX_LOGS);
    }

    this.emit('log', entry);
  }

  public getLogs(source?: LogSource): LogEntry[] {
    if (source) {
      return this.logs.filter(l => l.source === source);
    }
    return this.logs;
  }

  public clear() {
    this.logs = [];
    this.emit('clear');
  }
}

export const logRedirector = LogRedirector.getInstance();
