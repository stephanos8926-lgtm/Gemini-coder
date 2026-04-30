import { bus } from '../lib/ehp/Bus';
import { EHPEnvelope, PrincipalType } from '../lib/ehp/types';
import { LogTool } from '../../packages/nexus/telemetry/LogTool';
import * as path from 'path';

const logger = new LogTool('SecurityWarden');

/**
 * Security Warden - The Governance Gate
 * Enforces RBAC and platform integrity on the EHP.
 */
export class SecurityWarden {
  private static instance: SecurityWarden;

  private constructor() {
    this.setupInterceptors();
    logger.info('Security Warden Vigilant');
  }

  public static getInstance(): SecurityWarden {
    if (!SecurityWarden.instance) {
      SecurityWarden.instance = new SecurityWarden();
    }
    return SecurityWarden.instance;
  }

  private setupInterceptors() {
    // Intercept file operations
    bus.subscribe('fs.write', (envelope) => this.interceptFileOperation(envelope));
    bus.subscribe('fs.read', (envelope) => this.interceptFileOperation(envelope));
    bus.subscribe('fs.delete', (envelope) => this.interceptFileOperation(envelope));
    
    // Intercept tool executions
    bus.subscribe('tool.execute', (envelope) => this.interceptToolExecution(envelope));
  }

  private async interceptFileOperation(envelope: EHPEnvelope) {
    const { filePath } = envelope.payload;
    const { type: principalType } = envelope.source;
    const { role } = envelope.auth;

    // RULE: Restricted infrastructure folder '.forge'
    // Users: No access.
    // AI Agents: Conditional read/write access.
    if (filePath && (filePath.includes('.forge') || path.basename(filePath).startsWith('.forge'))) {
      if (principalType === PrincipalType.USER && role !== 'admin') {
        logger.error('Security Violation: User attempted access to .forge', undefined, { 
          uid: envelope.auth.uid, 
          path: filePath 
        });
        return bus.respond(envelope.id, false);
      }

      if (principalType === PrincipalType.AGENT) {
        // AI Agents can access .forge if they have specific context or permission
        const hasAccess = envelope.auth.permissions.includes('infra:access');
        if (!hasAccess) {
          logger.warn('Governance: AI Agent blocked from .forge (missing infra:access)', { 
            agentId: envelope.source.id 
          });
          return bus.respond(envelope.id, false);
        }
      }
    }

    // Default Allow (for now, eventually follow strict RBAC whitelist)
    bus.respond(envelope.id, true);
  }

  private async interceptToolExecution(envelope: EHPEnvelope) {
    const { toolName } = envelope.payload;
    
    // Red flag: AI attempting to execute high-risk commands outside of strict TDD
    if (envelope.source.type === PrincipalType.AGENT) {
      if (toolName === 'shell_exec' && !envelope.auth.permissions.includes('exec:shell')) {
         logger.error('Governance: High-risk tool blocked', undefined, { toolName, agentId: envelope.source.id });
         return bus.respond(envelope.id, false);
      }
    }

    bus.respond(envelope.id, true);
  }
}

export const warden = SecurityWarden.getInstance();
