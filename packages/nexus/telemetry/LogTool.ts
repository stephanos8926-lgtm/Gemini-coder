import winston from 'winston';
import { ForgeGuard } from '../guard/ForgeGuard';
import path from 'path';
import fs from 'fs';

export class LogTool {
  private logger: winston.Logger;
  private guard: ForgeGuard;

  constructor(moduleName: string, userId?: string) {
    this.guard = ForgeGuard.init(moduleName);

    const logDir = userId ? path.join(process.cwd(), 'data', 'logs', `user_${userId}`) : path.join(process.cwd(), 'data', 'logs', 'system');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Initialize Winston
    this.logger = winston.createLogger({
      level: this.guard.config.get('LOG_LEVEL', 'info'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format((info) => {
          const sensitiveFields = ['apiKey', 'secretKey', 'password', 'token', 'idToken'];
          const mask = (obj: any) => {
            if (!obj || typeof obj !== 'object') return obj;
            for (const key in obj) {
              if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
                obj[key] = '***REDACTED***';
              } else if (typeof obj[key] === 'object') {
                mask(obj[key]);
              }
            }
            return obj;
          };
          mask(info);
          return info;
        })(),
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
