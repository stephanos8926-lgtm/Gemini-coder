import { SchemaType } from '@google/generative-ai';

export interface ToolMetadata {
  name: string;
  description: string;
  parameters: any;
  usageGuidelines?: string;
  oneShotExamples?: string;
  execute?: (args: any, context?: any) => Promise<any>;
}

export class ToolRegistryMesh {
  private static instance: ToolRegistryMesh;
  private tools: Map<string, ToolMetadata> = new Map();

  private constructor() {}

  public static getInstance(): ToolRegistryMesh {
    if (!ToolRegistryMesh.instance) {
      ToolRegistryMesh.instance = new ToolRegistryMesh();
    }
    return ToolRegistryMesh.instance;
  }

  public registerTool(metadata: ToolMetadata) {
    this.tools.set(metadata.name, metadata);
  }

  public getTool(name: string): ToolMetadata | undefined {
    return this.tools.get(name);
  }

  public getSystemPromptBlock(): any[] {
    return Array.from(this.tools.values()).map(tool => ({
      functionDeclarations: [{
        name: tool.name,
        description: `${tool.description} ${tool.usageGuidelines || ''}`,
        parameters: tool.parameters
      }]
    }));
  }
}

export const toolRegistry = ToolRegistryMesh.getInstance();
