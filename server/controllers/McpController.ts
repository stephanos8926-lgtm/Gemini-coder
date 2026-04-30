import { Request, Response } from 'express';
import fs from 'fs/promises';
import { ForgeGuard } from '../../packages/nexus/guard/ForgeGuard';
import { LogTool } from '../../packages/nexus/telemetry/LogTool';
import { mcpClientPool, getMcpClient } from '../mcpClient'; // Assuming these are exported from server.ts or moved

const guard = ForgeGuard.init('McpController');
const logger = new LogTool('McpController');
const WORKSPACE_ROOT = process.cwd();

export class McpController {
  public static async listServers(req: Request, res: Response) {
    try {
      await guard.protect(async () => {
        const config = JSON.parse(await fs.readFile('./mcp-config.json', 'utf-8'));
        const servers = [];
        
        for (const [serverName, serverDef] of Object.entries(config.tools as Record<string, any>)) {
          const isConnected = mcpClientPool.has(serverName);
          let tools: any[] = [];
          
          if (isConnected) {
            try {
              const entry = mcpClientPool.get(serverName)!;
              const toolsResponse = await entry.client.listTools();
              tools = toolsResponse.tools || [];
            } catch (e: any) {
              logger.error(`Error listing tools for ${serverName}:`, e);
            }
          }
          
          servers.push({
            name: serverName,
            status: isConnected ? 'connected' : 'disconnected',
            command: (serverDef as any).command,
            tools
          });
        }
        
        res.json(servers);
      }, { path: '/api/mcp/servers' });
    } catch (error: any) {
      logger.error('Error getting MCP servers', error);
      res.status(500).json({ error: 'Failed to get MCP servers' });
    }
  }

  public static async connectServer(req: Request, res: Response) {
    try {
      await guard.protect(async () => {
        const { serverName } = req.body;
        const config = JSON.parse(await fs.readFile('./mcp-config.json', 'utf-8'));
        const serverDef = config.tools[serverName];
        
        if (!serverDef) {
          return res.status(404).json({ error: 'Server not found' });
        }
        
        await getMcpClient(serverName, serverDef, WORKSPACE_ROOT);
        res.json({ success: true });
      }, { path: '/api/mcp/connect' });
    } catch (error: any) {
      logger.error('Error connecting to MCP server', error);
      res.status(500).json({ error: 'Failed to connect' });
    }
  }
}
