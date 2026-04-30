import { EventEmitter } from 'events';
import { EHPEnvelope, EHPMessageType } from './types';
import { LogTool } from '../../../packages/nexus/telemetry/LogTool';

const logger = new LogTool('EHP-Bus');

/**
 * Event Horizon Pipeline Bus
 * The mission-critical communication backbone.
 */
export class EHPBus extends EventEmitter {
  private static instance: EHPBus;
  private messageHistory: EHPEnvelope[] = [];
  private readonly MAX_HISTORY = 1000;

  private constructor() {
    super();
    this.setMaxListeners(100);
    logger.info('EHP Bus Initialized');
  }

  public static getInstance(): EHPBus {
    if (!EHPBus.instance) {
      EHPBus.instance = new EHPBus();
    }
    return EHPBus.instance;
  }

  /**
   * Publish a message to the bus.
   * This handles both async and sync orchestration.
   */
  public async publish(envelope: EHPEnvelope): Promise<void> {
    // 1. Auditing
    this.audit(envelope);

    // 2. Emission
    this.emit(envelope.topic, envelope);
    this.emit('*', envelope); // Global monitor

    // 3. Operational Integrity
    if (envelope.type === EHPMessageType.ALERT) {
      logger.warn('Critical Alert detected on EHP', { 
        topic: envelope.topic, 
        source: envelope.source.id 
      });
    }
  }

  /**
   * Subscribe to a topic.
   */
  public subscribe(topic: string, callback: (envelope: EHPEnvelope) => void): void {
    this.on(topic, callback);
  }

  /**
   * Specialized synchronous call for high-priority governance.
   * This waits for all listeners (Warden) to validate before proceeding.
   */
  public async request(envelope: EHPEnvelope, timeoutMs: number = 5000): Promise<boolean> {
    this.audit(envelope);
    
    // We treat this as a BLOCKING request for the Security Warden
    // Listeners must emit a 'response:{id}' message
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        logger.error('EHP Request Timeout', undefined, { requestId: envelope.id });
        this.removeAllListeners(`response:${envelope.id}`);
        resolve(false); // Fail closed on timeout
      }, timeoutMs);

      this.once(`response:${envelope.id}`, (allowed: boolean) => {
        clearTimeout(timeout);
        resolve(allowed);
      });

      this.emit(envelope.topic, envelope);
    });
  }

  public respond(requestId: string, allowed: boolean): void {
    this.emit(`response:${requestId}`, allowed);
  }

  private audit(envelope: EHPEnvelope): void {
    this.messageHistory.push(envelope);
    if (this.messageHistory.length > this.MAX_HISTORY) {
      this.messageHistory.shift();
    }
    
    // In production, this would stream to a persistent database (e.g. Firestore)
    logger.info(`EHP Audit: ${envelope.topic}`, { 
      id: envelope.id, 
      source: envelope.source.id, 
      type: envelope.type 
    });
  }

  public getHistory(): EHPEnvelope[] {
    return [...this.messageHistory];
  }
}

export const bus = EHPBus.getInstance();
