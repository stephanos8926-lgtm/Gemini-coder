import { BaseForgeAgent, AgentManifest } from './BaseForgeAgent';
import { AIContext, AIRuntimeState } from '../types';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { DynamicTool } from '@langchain/core/tools';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { ProjectContextEngine } from '../../../utils/ProjectContextEngine';

/**
 * StandardForgeAgent
 * A concrete implementation of BaseForgeAgent using LangChain, Google Gemini and LangGraph.
 */
export class StandardForgeAgent extends BaseForgeAgent {
  private model: ChatGoogleGenerativeAI;
  private tools: any[];

  constructor(manifest: AgentManifest) {
    super(manifest);
    this.model = new ChatGoogleGenerativeAI({
      model: manifest.model,
      temperature: manifest.temperature,
      apiKey: process.env.GEMINI_API_KEY
    });

    this.tools = this.initializeTools();
  }

  private initializeTools(): DynamicTool[] {
    const tools: DynamicTool[] = [];

    // Context Engine Tool
    tools.push(new DynamicTool({
      name: 'query_project_context',
      description: 'Search the project for relevant code symbols, files, and documentation based on a semantic query.',
      func: async (query: string) => {
        const engine = ProjectContextEngine.getInstance();
        const results = await engine.getRelevantContext(query, 5);
        return JSON.stringify(results.map((r: any) => ({ path: r.path, content: r.content.substring(0, 500) })));
      }
    }));

    // Add more tools based on manifest.capabilities
    if (this.manifest.capabilities.includes('shell')) {
      // Add shell tool
    }

    return tools;
  }

  public async execute(input: string, context: AIContext, state: AIRuntimeState): Promise<string> {
    try {
      const systemPrompt = await this.getEffectiveSystemPrompt(context);
      
      await this.emitTrace('Executing agent', { tier: this.tier, model: this.manifest.model, tools: this.tools.map(t => t.name) });

      // Using LangGraph prebuilt React Agent for tool calling loop
      const agent = createReactAgent({
        llm: this.model,
        tools: this.tools,
        messageModifier: systemPrompt
      });

      const response = await agent.invoke({
        messages: [new HumanMessage(input)]
      });

      const lastMessage = response.messages[response.messages.length - 1];
      const content = typeof lastMessage.content === 'string' ? lastMessage.content : JSON.stringify(lastMessage.content);
      
      return content;
    } catch (error) {
      await this.emitTrace('Agent execution failed', { error });
      throw error;
    }
  }
}
