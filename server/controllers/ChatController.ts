import { Request, Response } from 'express';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { ChatRequestSchema } from '../../src/lib/schemas';
import { ForgeGuard } from '../../packages/nexus/guard/ForgeGuard';
import { LogTool } from '../../packages/nexus/telemetry/LogTool';
import { summarizeChatHistory } from '../../src/lib/summarizer';
import { executeTool } from '../../src/lib/toolExecutor';

import { McpToolService } from '../../src/services/McpToolService';

const guard = ForgeGuard.init('ChatController');
const logger = new LogTool('ChatController');

export class ChatController {
  public static async handleChat(req: Request, res: Response) {
    try {
      await guard.protect(async () => {
        const { messages, model, apiKey, systemInstruction, temperature, skillName, skillState, workspace } = ChatRequestSchema.parse(req.body);
        const finalApiKey = apiKey || process.env.GEMINI_API_KEY;
        
        if (!finalApiKey) {
          return res.status(400).json({ error: 'API Key required' });
        }

        const ai = new GoogleGenerativeAI(finalApiKey);
        const generativeModel = ai.getGenerativeModel({ model, systemInstruction });

        const formattedMessages = messages.map((m: any) => {
          const parts: any[] = [];
          if (m.content) parts.push({ text: m.content });
          if (m.functionCalls) {
            m.functionCalls.forEach((fc: any) => parts.push({ functionCall: { name: fc.name, args: fc.args } }));
          }
          if (m.functionResponses) {
            m.functionResponses.forEach((fr: any) => parts.push({ functionResponse: { name: fr.name, response: fr.response } }));
          }
          return {
            role: m.role === 'assistant' ? 'model' : (m.role === 'function' ? 'user' : m.role),
            parts
          };
        });

        const enabledMcpTools = await McpToolService.getEnabledTools();
        const mcpFunctionDeclarations = enabledMcpTools.map((tool: any) => ({
          name: tool.name.replace(/[^a-zA-Z0-9_]/g, '_'),
          description: tool.description || `Execute a tool on the ${tool.name} MCP server.`,
          parameters: {
            type: SchemaType.OBJECT,
            properties: {
              toolName: { type: SchemaType.STRING, description: 'The specific tool to execute on this server (e.g., read_file, search).' },
              args: { type: SchemaType.STRING, description: 'JSON string of arguments for the tool.' }
            },
            required: ['toolName', 'args']
          }
        }));

        // Register tools (MCP + System)
        const tools = [
          { functionDeclarations: mcpFunctionDeclarations }
        ];

        let resultStream = await generativeModel.generateContentStream({
          contents: formattedMessages,
          generationConfig: { temperature },
          tools: tools as any
        });

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        let currentMessages = formattedMessages;
        for await (const chunk of resultStream.stream) {
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }

        let lastResponse = await resultStream.response;
        let functionCalls = lastResponse.functionCalls();

        while (functionCalls && functionCalls.length > 0) {
          logger.info('Model requested tool calls', { functionCalls });
          const functionResponses: any[] = [];
          
          for (const call of functionCalls) {
            const result = await executeTool(call.name, call.args, {});
            functionResponses.push({ name: call.name, response: result });
          }

          currentMessages.push({ role: 'model', parts: functionCalls.map(c => ({ functionCall: c })) });
          currentMessages.push({ role: 'user', parts: functionResponses.map(fr => ({ functionResponse: { name: fr.name, response: fr.response } })) });

          resultStream = await generativeModel.generateContentStream({
            contents: currentMessages,
            generationConfig: { temperature },
            tools: tools as any
          });

          for await (const chunk of resultStream.stream) {
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
          }
          lastResponse = await resultStream.response;
          functionCalls = lastResponse.functionCalls();
        }

        res.write('data: [DONE]\n\n');
        res.end();
      }, { requestId: req.headers['x-request-id'] as string, path: '/api/chat' });
    } catch (error: any) {
      logger.error('Chat controller error', error);
      if (!res.headersSent) res.status(500).json({ error: error.message });
      else res.end();
    }
  }
}
