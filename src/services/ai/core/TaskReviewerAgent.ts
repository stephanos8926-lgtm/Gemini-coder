import { StandardForgeAgent } from './StandardForgeAgent';
import { AgentTier, AgentCategory, AgentManifest } from './BaseForgeAgent';
import { AIContext, AIRuntimeState } from '../types';

/**
 * TaskReviewerAgent
 * A Tier 3 specialized agent for reviewing background task progress and suggesting optimizations.
 */
export class TaskReviewerAgent extends StandardForgeAgent {
  constructor() {
    const manifest: AgentManifest = {
      id: 'task-reviewer',
      tier: AgentTier.TIER_3,
      category: AgentCategory.INTERNAL,
      role: 'SRE Optimization Specialist',
      capabilities: ['context-review', 'log-analysis'],
      model: 'gemini-1.5-flash-preview-0514',
      temperature: 0.3,
      systemPrompt: `You are the Forge Task Reviewer. 
Your goal is to analyze the state of a current background task and suggest improvements, 
potential sub-tasks for better parallelism, or identify if the agent is stuck.
Be concise and actionable.`
    };
    super(manifest);
  }

  public async reviewTask(taskData: any): Promise<string> {
    const input = `Task ID: ${taskData.id}
Status: ${taskData.status}
Prompt: ${taskData.prompt}
Current Step: ${taskData.currentStep}
Progress: ${taskData.progress * 100}%
Logs (Recent): ${JSON.stringify(taskData.logs || [])}

Please provide a brief recommendation.`;
    
    // Default context for internal review
    const context: AIContext = {
      model: this.manifest.model,
      userId: 'system',
      projectName: taskData.projectId,
      uid: 'system',
      roles: ['admin']
    };
    
    const state: AIRuntimeState = { warnings: [] };
    
    return this.execute(input, context, state);
  }
}
