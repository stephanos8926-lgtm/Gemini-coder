// ForgeGuard ErrorBoundary v2.0.0 - Production Grade
import { EventEmitter } from 'events';

export interface ForgeContext {
  requestId?: string;
  userId?: string;
  path?: string;
  method?: string;
  [key: string]: unknown;
}

export interface ForgeError extends Error {
  code?: string;
  statusCode?: number;
  retryable?: boolean;
}

export interface CaptureOptions {
  maxRetries?: number;
  backoffMs?: number;
  timeoutMs?: number;
  retryCondition?: (err: ForgeError) => boolean;
}

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

function normalizeError(err: unknown): ForgeError {
  if (err instanceof Error) return err as ForgeError;
  return { name: 'UnknownError', message: String(err) };
}

function sanitizeContext(ctx?: ForgeContext): ForgeContext | undefined {
  if (!ctx) return undefined;
  const clone: ForgeContext = {};
  for (const key in ctx) {
    clone[key] = /password|token|secret|auth/i.test(key) ? '[REDACTED]' : ctx[key];
  }
  return clone;
}

export class ErrorBoundary extends EventEmitter {
  async capture<T>(fn: () => Promise<T>, ctx: ForgeContext = {}, opts: CaptureOptions = {}): Promise<T> {
    const { maxRetries = 3, backoffMs = 1000, timeoutMs = 5000 } = opts;
    let lastErr: ForgeError | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await Promise.race([
          fn(),
          new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeoutMs))
        ]);
      } catch (err) {
        lastErr = normalizeError(err);
        this.emit('error', { error: lastErr, context: sanitizeContext(ctx), attempt });
        if (attempt < maxRetries - 1) await sleep(backoffMs * (attempt + 1));
      }
    }
    throw lastErr as T;
  }
}
