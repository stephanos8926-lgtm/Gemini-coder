import { ForgeGuard } from './ForgeGuard';

export interface Signal {
  type: 'error' | 'warn' | 'info';
  payload: any;
  timestamp: number;
  source?: string;
  context?: any;
}

export class Omitter {
  private moduleName: string;

  constructor(moduleName: string) {
    this.moduleName = moduleName;
  }

  /**
   * Manual emission for try-catch blocks.
   */
  public emit(error: any, context?: any) {
    const guard = ForgeGuard.init(this.moduleName);
    guard.emitSignal({
      type: 'error',
      payload: error instanceof Error ? { message: error.message, stack: error.stack } : error,
      timestamp: Date.now(),
      context
    });
  }

  /**
   * Transparently hooks into a function using a Proxy.
   * Catches errors, emits signals, and rethrows to maintain control flow.
   */
  public static hook<T extends Function>(fn: T, moduleName: string, context?: any): T {
    return new Proxy(fn, {
      apply: (target, thisArg, args) => {
        try {
          const result = target.apply(thisArg, args);
          
          // Handle Async Functions
          if (result instanceof Promise) {
            return result.catch(err => {
              const guard = ForgeGuard.init(moduleName);
              guard.emitSignal({
                type: 'error',
                payload: err instanceof Error ? { message: err.message, stack: err.stack } : err,
                timestamp: Date.now(),
                source: target.name,
                context: { ...context, args, isAsync: true }
              });
              throw err; // Rethrow to maintain original behavior
            });
          }
          
          return result;
        } catch (err) {
          // Handle Sync Functions
          const guard = ForgeGuard.init(moduleName);
          guard.emitSignal({
            type: 'error',
            payload: err instanceof Error ? { message: err.message, stack: err.stack } : err,
            timestamp: Date.now(),
            source: target.name,
            context: { ...context, args, isAsync: false }
          });
          throw err;
        }
      }
    }) as any;
  }
}

