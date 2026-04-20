import { Skill, SkillRegistry } from './SkillRegistry';
import { ForgeGuard } from '../utils/ForgeGuard';
import { LogTool } from '../utils/LogTool';
import { ProjectContextEngine } from '../utils/ProjectContextEngine';
import { ToolDispatcher } from './ToolDispatcher';

export interface SkillState {
  skillName: string;
  currentStepIndex: number;
  results: Record<string, any>;
  context: Record<string, any>;
}

export class SkillExecutor {
  private logger = new LogTool('SkillExecutor');
  private guard = ForgeGuard.init('SkillExecutor');
  private contextEngine = ProjectContextEngine.getInstance();
  private dispatcher = new ToolDispatcher();

  async execute(skillName: string, userInput: string, state?: SkillState): Promise<{ result: any, nextState?: SkillState }> {
    const skill = SkillRegistry.getInstance().getSkill(skillName);
    if (!skill) throw new Error(`Skill ${skillName} not found`);

    const currentState = state || {
      skillName,
      currentStepIndex: 0,
      results: {},
      context: { userInput }
    };

    // 1. Planner/Decomposition (Simplified for now)
    const step = skill.steps[currentState.currentStepIndex];
    
    // 2. Runtime Context Injection (RAG)
    const relevantContext = await this.contextEngine.getRelevantContext(
        currentState.context.userInput, 
        5, 
        { skillName: skill.name, stepName: step.name }
    );
    currentState.context.relevantFiles = relevantContext;
    
    this.logger.info(`Executing step ${step.name} using tool ${step.tool}`);

    try {
      // 3. Execution using ToolDispatcher
      const result = await this.dispatcher.dispatch(step.tool, step.args, currentState.context);
      
      currentState.results[step.name] = result;
      currentState.currentStepIndex++;

      if (currentState.currentStepIndex >= skill.steps.length) {
        return { result: currentState.results, nextState: undefined };
      }

      return { result: `Step ${step.name} completed. Moving to next step.`, nextState: currentState };
    } catch (error) {
      // 5. Resilience Layer
      this.logger.error(`Step ${step.name} failed`, error as Error);
      return { result: `Step ${step.name} failed: ${error}`, nextState: currentState };
    }
  }
}
