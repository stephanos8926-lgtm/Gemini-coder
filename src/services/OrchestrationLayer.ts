import { bus } from '../lib/ehp/Bus';
import { EHPEnvelope, EHPMessageType, EHPService, PrincipalType } from '../lib/ehp/types';
import { LogTool } from '../../packages/nexus/telemetry/LogTool';
import { v4 as uuidv4 } from 'uuid';

const logger = new LogTool('OrchestrationLayer');

/**
 * Platform Orchestration Layer (POL)
 * The supervisor service for platform integrity and service management.
 */
export class OrchestrationLayer {
  private static instance: OrchestrationLayer;
  private services: Map<string, EHPService> = new Map();

  private constructor() {
    this.setupListeners();
    logger.info('Orchestration Layer Activated');
  }

  public static getInstance(): OrchestrationLayer {
    if (!OrchestrationLayer.instance) {
      OrchestrationLayer.instance = new OrchestrationLayer();
    }
    return OrchestrationLayer.instance;
  }

  private setupListeners() {
    // Listen for service heartbeats
    bus.subscribe('service.heartbeat', (envelope: EHPEnvelope) => {
      this.handleHeartbeat(envelope);
    });

    // Listen for critical failures
    bus.subscribe('system.failure', (envelope: EHPEnvelope) => {
      this.remediate(envelope);
    });

    // Autonomous tech support - monitoring logs/telemetry via EHP
    bus.subscribe('telemetry.error', (envelope: EHPEnvelope) => {
      this.analyzeError(envelope);
    });
  }

  private handleHeartbeat(envelope: EHPEnvelope) {
    const serviceData = envelope.payload as EHPService;
    this.services.set(serviceData.id, {
      ...serviceData,
      lastHeartbeat: Date.now()
    });
  }

  private async analyzeError(envelope: EHPEnvelope) {
    const { error, stack } = envelope.payload;
    logger.info('POL analyzing platform error', { error });

    // AI-Enhanced oversight: Here we could call a specialized "SRE Agent" 
    // to suggest a fix or update MEMORY.md for future prevention.
    if (error.includes('Access denied')) {
       logger.warn('Security anomaly detected by POL', { uid: envelope.auth.uid });
    }
  }

  private async remediate(envelope: EHPEnvelope) {
    logger.warn('POL trigger remediation task', { source: envelope.source.id });
    
    // In a real sysd-like system, this would restart a microservice or worker
    const remediationTask = {
      id: uuidv4(),
      type: 'RESTART_SERVICE',
      target: envelope.source.id,
      priority: 255
    };

    await bus.publish({
      id: uuidv4(),
      type: EHPMessageType.COMMAND,
      timestamp: Date.now(),
      priority: 255,
      source: { id: 'POL', type: PrincipalType.SYSTEM },
      destination: envelope.source.id,
      topic: 'service.restart',
      payload: remediationTask,
      context: envelope.context,
      auth: envelope.auth
    });
  }

  public registerService(service: EHPService) {
    this.services.set(service.id, service);
    logger.info(`Service registered with POL: ${service.name}`, { id: service.id });
  }

  public getServiceStatus() {
    return Array.from(this.services.values());
  }
}

export const orchestrator = OrchestrationLayer.getInstance();
