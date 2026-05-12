import { BaseForgeAgent, AgentManifest, AgentTier, AgentCategory } from './BaseForgeAgent';
import { LogTool } from '../../../../packages/nexus/telemetry/LogTool';

const logger = new LogTool('AgentRegistry');

/**
 * AgentRegistry
 * Manages the lifecycle and discovery of ForgeAgents.
 */
export class AgentRegistry {
  private static instance: AgentRegistry;
  private agents: Map<string, AgentManifest> = new Map();
  private templates: Map<string, Partial<AgentManifest>> = new Map();

  private constructor() {
    this.bootstrap();
  }

  public static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  private bootstrap() {
    // Define base templates (Tier 2)
    this.registerTemplate('IDE_ASSISTANT_BASE', {
      tier: AgentTier.TIER_2,
      category: AgentCategory.USER_FACING,
      role: 'Code Assistant',
      systemPrompt: 'You are the RapidForge IDE Assistant. Help the user write high-quality TypeScript code following {{ ROLES }} permissions.',
      model: 'gemini-1.5-pro-preview-0514'
    });

    this.registerTemplate('MINI_AGENT_BASE', {
      tier: AgentTier.TIER_2,
      category: AgentCategory.INTERNAL,
      role: 'Context Optimizer',
      systemPrompt: 'Summarize the following context while preserving critical symbols and references.',
      model: 'gemini-1.5-flash-preview-0514',
      temperature: 0.1
    });

    this.registerTemplate('POL_AGENT_BASE', {
      tier: AgentTier.TIER_2,
      category: AgentCategory.INTERNAL,
      role: 'Platform Orchestrator',
      systemPrompt: 'Monitor system health and suggest remediation for {{ PROJECT_NAME }}.',
      model: 'gemini-1.5-pro-preview-0514'
    });
  }

  public registerTemplate(id: string, template: Partial<AgentManifest>) {
    this.templates.set(id, template);
  }

  public registerAgent(agent: AgentManifest) {
    this.agents.set(agent.id, agent);
    logger.info(`Agent registered: ${agent.id} (Tier ${agent.tier})`);
  }

  public getManifest(id: string): AgentManifest | undefined {
    return this.agents.get(id);
  }

  public listAgents(category?: AgentCategory): AgentManifest[] {
    const list = Array.from(this.agents.values());
    if (category) {
      return list.filter(a => a.category === category);
    }
    return list;
  }

  public async deriveAgent(id: string, templateId: string, overrides: Partial<AgentManifest>): Promise<AgentManifest> {
    const template = this.templates.get(templateId);
    if (!template) throw new Error(`Template not found: ${templateId}`);

    const manifest: AgentManifest = {
      id,
      tier: overrides.tier || template.tier || AgentTier.TIER_3,
      category: overrides.category || template.category || AgentCategory.INTERNAL,
      role: overrides.role || template.role || 'Specialist',
      capabilities: overrides.capabilities || template.capabilities || [],
      model: overrides.model || template.model || 'gemini-1.5-flash-preview-0514',
      temperature: overrides.temperature ?? template.temperature ?? 0.7,
      systemPrompt: overrides.systemPrompt || template.systemPrompt || '',
      parentTemplate: templateId,
      config: { ...(template.config || {}), ...(overrides.config || {}) }
    };

    this.registerAgent(manifest);
    return manifest;
  }
}

export const agentRegistry = AgentRegistry.getInstance();
