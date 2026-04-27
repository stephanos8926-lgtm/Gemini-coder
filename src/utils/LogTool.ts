import winston from 'winston';
import { ForgeGuard } from './ForgeWrappers';
import path from 'path';
import fs from 'fs';

export class LogTool {
  private logger: winston.Logger;
  private guard: any;

  constructor(moduleName: string, userId?: string) {
    this.guard = ForgeGuard.init(moduleName);

    const logDir = userId ? path.join(process.cwd(), 'logs', `user_${userId}`) : path.join(process.cwd(), 'logs', 'system');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Initialize Winston
    this.logger = winston.createLogger({
      level: this.guard?.config?.get ? this.guard.config.get('LOG_LEVEL', 'info') : 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { service: moduleName, userId },
      transports: [
        new winston.transports.Console({
          format: winston.format.simple(),
        }),
        new winston.transports.File({
          filename: path.join(logDir, 'error.log'),
          level: 'error',
        }),
        new winston.transports.File({
          filename: path.join(logDir, 'combined.log'),
        }),
      ],
    });
  }

  public info(message: string, meta?: any) {
    this.logger.info(message, meta);
    this.guard.emitSignal({ type: 'info', payload: { message, meta }, timestamp: Date.now() });
  }

  public warn(message: string, meta?: any) {
    this.logger.warn(message, meta);
    this.guard.emitSignal({ type: 'warn', payload: { message, meta }, timestamp: Date.now() });
  }

  public error(message: string, error?: Error, meta?: any) {
    this.logger.error(message, { error: error?.message, stack: error?.stack, ...meta });
    this.guard.emitSignal({ 
      type: 'error', 
      payload: { message, error: error?.message, stack: error?.stack, meta }, 
      timestamp: Date.now() 
    });
  }
}
