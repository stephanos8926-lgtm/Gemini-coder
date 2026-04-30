import fs from 'fs/promises';
import { LogTool } from '../../packages/nexus/telemetry/LogTool';

const logger = new LogTool('McpToolService');
const MCP_CACHE_TTL_MS = 60000;

let cachedTools: any[] | null = null;
let lastConfigRead: number = 0;

export class McpToolService {
  public static async getEnabledTools() {
    const now = Date.now();
    if (cachedTools && now - lastConfigRead < MCP_CACHE_TTL_MS) {
      return cachedTools;
    }
    
    try {
      const configPath = './mcp-config.json';
      const content = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(content);
      
      cachedTools = Object.entries(config.tools || {})
        .filter(([_, tool]: any) => tool.enabled)
        .map(([name, tool]: any) => ({ name, ...tool }));
        
      lastConfigRead = now;
      return cachedTools || [];
    } catch (error: any) {
      logger.error('Error reading mcp-config.json', error);
      return [];
    }
  }
}
