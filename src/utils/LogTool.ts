import winston from 'winston';
import { ForgeGuard } from './ForgeGuard';

export class LogTool {
  private logger: winston.Logger;
  private guard: ForgeGuard;

  constructor(moduleName: string) {
    this.guard = ForgeGuard.init(moduleName);

    // Initialize Winston
    this.logger = winston.createLogger({
      level: this.guard.config.get('LOG_LEVEL', 'info'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { service: moduleName },
      transports: [
        new winston.transports.Console({
          format: winston.format.simple(),
        }),
        // We can add file transports here if needed, but ForgeGuard handles advanced routing
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
