import { bus } from '../../../lib/ehp/Bus';
import { EHPEnvelope, EHPMessageType, PrincipalType } from '../../../lib/ehp/types';
import { v4 as uuidv4 } from 'uuid';
import { AIContext, AIRuntimeState } from '../types';

export enum AgentTier {
  TIER_1 = 1, // Core Primitive
  TIER_2 = 2, // Domain Controller
  TIER_3 = 3  // Task Specialist
}

export enum AgentCategory {
  INTERNAL = 'INTERNAL',
  USER_FACING = 'USER_FACING'
}

export interface AgentManifest {
  id: string;
  tier: AgentTier;
  category: AgentCategory;
  role: string;
  capabilities: string[];
  model: string;
  temperature: number;
  systemPrompt: string;
  parentTemplate?: string;
  config?: Record<string, any>;
}

/**
 * BaseForgeAgent
 * The tier 1 primitive for all AI agents in the RapidForge ecosystem.
 * Standardizes communication via EHP and enforces hierarchical system prompts.
 */
export abstract class BaseForgeAgent {
  protected manifest: AgentManifest;

  constructor(manifest: AgentManifest) {
    this.manifest = manifest;
  }

  public get id() { return this.manifest.id; }
  public get tier() { return this.manifest.tier; }
  public get category() { return this.manifest.category; }

  /**
   * Generates the hierarchical system prompt by compounding parent prompts.
   */
  public async getEffectiveSystemPrompt(context: AIContext): Promise<string> {
    let prompt = this.manifest.systemPrompt;
    
    // In a full implementation, we would recursively fetch parent templates from the Registry
    // and append their system prompts here.
    
    // Simple variable injection
    prompt = this.compilePrompt(prompt, context);
    
    return prompt;
  }

  private compilePrompt(template: string, context: AIContext): string {
    let compiled = template;
    
    // Context variable embedding ({{ var }})
    const vars: Record<string, string> = {
      PROJECT_NAME: context.projectName || 'RapidForge Project',
      UID: context.uid || 'anonymous',
      ROLES: (context.roles || []).join(', '),
    };

    for (const [key, value] of Object.entries(vars)) {
      compiled = compiled.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), value);
    }

    return compiled;
  }

  /**
   * All tool calls must be published to the EHP.
   */
  protected async emitCommand(topic: string, payload: any, context: AIContext): Promise<void> {
    await bus.publish({
      id: uuidv4(),
      type: EHPMessageType.COMMAND,
      timestamp: Date.now(),
      priority: 1,
      source: { id: this.id, type: PrincipalType.AGENT },
      destination: 'BROADCAST',
      topic,
      payload,
      context: {
        sessionId: context.sessionId || uuidv4(),
        requestId: uuidv4(),
        workspaceId: context.workspace || 'default'
      },
      auth: {
        uid: context.uid || 'system',
        role: 'agent',
        permissions: context.roles || ['agent'],
        emailVerified: true
      }
    });
  }

  /**
   * Log internal "thoughts" for observability.
   */
  protected async emitTrace(message: string, context: any = {}): Promise<void> {
    await bus.publish({
      id: uuidv4(),
      type: EHPMessageType.EVENT,
      timestamp: Date.now(),
      priority: 0,
      source: { id: this.id, type: PrincipalType.AGENT },
      destination: 'SYSTEM_LOG',
      topic: 'agent.trace',
      payload: { message, ...context },
      context: { requestId: uuidv4(), workspaceId: 'internal' },
      auth: { uid: 'system', role: 'admin', permissions: ['agent'] }
    });
  }

  public abstract execute(input: string, context: AIContext, state: AIRuntimeState): Promise<string>;
}
