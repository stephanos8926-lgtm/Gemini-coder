import { ForgeGuard } from '../guard/ForgeGuard';
import { Signal as NexusSignal } from '../guard/Sensor';

export class Omitter {
  private moduleName: string;

  constructor(moduleName: string) {
    this.moduleName = moduleName;
  }

  /**
   * Manual emission for try-catch blocks.
   */
  public emit(error: unknown, context?: Record<string, unknown>) {
    const guard = ForgeGuard.init(this.moduleName);
    guard.emitSignal({
      type: 'error',
      payload: error instanceof Error ? { message: error.message, stack: error.stack } : error,
      timestamp: Date.now(),
      context
    } as NexusSignal);
  }

  /**
   * Transparently hooks into a function using a Proxy.
   * Catches errors, emits signals, and rethrows to maintain control flow.
   * 
   * IMPROVEMENT: Added capability for custom 'severity' mapping and 
   * broader support for non-Function types if needed.
   */
  public static hook<T extends Function>(
    fn: T, 
    moduleName: string, 
    context?: Record<string, unknown>
  ): T {
    return new Proxy(fn, {
      apply: (target, thisArg, args) => {
        try {
          const result = target.apply(thisArg, args);
          
          if (result instanceof Promise) {
            return result.catch((err: unknown) => {
              this.handleError(err, moduleName, target.name, { ...context, args, isAsync: true });
              throw err;
            });
          }
          
          return result;
        } catch (err) {
          this.handleError(err, moduleName, target.name, { ...context, args, isAsync: false });
          throw err;
        }
      }
    }) as unknown as T;
  }

  private static handleError(
    err: unknown, 
    moduleName: string, 
    source: string, 
    context: Record<string, unknown>
  ) {
    const guard = ForgeGuard.init(moduleName);
    guard.emitSignal({
      type: 'error',
      payload: err instanceof Error ? { message: err.message, stack: err.stack } : err,
      timestamp: Date.now(),
      source,
      context
    } as NexusSignal);
  }
}
