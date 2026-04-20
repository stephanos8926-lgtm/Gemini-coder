import { LogTool } from '../utils/LogTool';

export interface TelemetryMetrics {
  uptime: number;
  restarts: number;
  errors: { type: string; count: number; impact: string }[];
  genAiUsage: { model: string; calls: number; tokens: number }[];
  conversationMetrics: { totalConversations: number; avgContextWindow: number };
}

class TelemetryAggregator {
  private metrics: TelemetryMetrics = {
    uptime: 0,
    restarts: 0,
    errors: [],
    genAiUsage: [],
    conversationMetrics: { totalConversations: 0, avgContextWindow: 0 },
  };

  private logger = new LogTool('TelemetryAggregator');

  constructor() {
    this.metrics.uptime = Date.now();
  }

  recordError(type: string, impact: string) {
    const existing = this.metrics.errors.find(e => e.type === type);
    if (existing) {
      existing.count++;
    } else {
      this.metrics.errors.push({ type, count: 1, impact });
    }
    this.logger.error(`Error recorded: ${type}`, new Error(impact));
  }

  recordGenAiUsage(model: string, tokens: number) {
    const existing = this.metrics.genAiUsage.find(u => u.model === model);
    if (existing) {
      existing.calls++;
      existing.tokens += tokens;
    } else {
      this.metrics.genAiUsage.push({ model, calls: 1, tokens });
    }
  }

  getMetrics(): TelemetryMetrics {
    return {
      ...this.metrics,
      uptime: Date.now() - this.metrics.uptime,
    };
  }
}

export const telemetryAggregator = new TelemetryAggregator();
