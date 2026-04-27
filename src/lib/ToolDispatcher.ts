import { toolRegistry } from './ToolRegistry';
import { LogTool } from '../utils/LogTool';
import { ForgeGuard } from '../utils/ForgeWrappers';

export class ToolDispatcher {
  private logger = new LogTool('ToolDispatcher');
  private guard = ForgeGuard.init('ToolDispatcher');
  private registry = toolRegistry;

  async dispatch(toolName: string, args: any, context: any): Promise<any> {
    return this.guard.protect(async () => {
      this.logger.info(`Dispatching tool: ${toolName}`, { args });
      
      const tool = this.registry.getTool(toolName);
      if (!tool) {
        throw new Error(`Tool ${toolName} not found`);
      }

      try {
        if (!tool.execute) {
          throw new Error(`Tool ${toolName} has no execute implementation on the backend`);
        }
        return await tool.execute(args, context);
      } catch (error) {
        this.logger.error(`Error executing tool ${toolName}`, error as Error);
        // Return structured error to model
        return {
          error: `Tool ${toolName} execution failed.`,
          message: error instanceof Error ? error.message : String(error),
          context: {
            tool: toolName,
            args: args,
            hint: "Check argument format and ensure all required parameters are provided."
          }
        };
      }
    }, { path: 'ToolDispatcher.dispatch' });
  }
}
