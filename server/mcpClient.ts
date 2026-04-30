import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { LogTool } from '../packages/nexus/telemetry/LogTool';

const logger = new LogTool('mcpClient');
const FIVE_MINUTES_MS = 5 * 60 * 1000;
const ONE_MINUTE_MS = 1 * 60 * 1000;

export const mcpClientPool = new Map<string, { client: Client, lastUsed: number }>();

export async function connectToMCP(serverPath: string, args: string[], workspaceRoot: string) {
  const transport = new StdioClientTransport({
    command: serverPath,
    args: args,
    env: {
      ...process.env,
      CWD: workspaceRoot,
    },
  });
  const client = new Client({
    name: "gide-mcp-client",
    version: "1.0.0",
  }, {
    capabilities: {},
  });
  await client.connect(transport);
  return client;
}

export async function getMcpClient(serverName: string, serverDef: any, workspaceRoot: string) {
  const existing = mcpClientPool.get(serverName);
  if (existing) {
    try {
      await existing.client.listTools();
      existing.lastUsed = Date.now();
      return existing.client;
    } catch {
      logger.warn(`MCP client ${serverName} unresponsive, recreating...`);
      mcpClientPool.delete(serverName);
    }
  }
  const client = await connectToMCP(serverDef.command, serverDef.args, workspaceRoot);
  mcpClientPool.set(serverName, { client, lastUsed: Date.now() });
  return client;
}

// Periodically clean up unused MCP clients
setInterval(() => {
  const now = Date.now();
  for (const [name, entry] of mcpClientPool.entries()) {
    if (now - entry.lastUsed > FIVE_MINUTES_MS) {
      entry.client.close();
      mcpClientPool.delete(name);
      logger.info(`Cleaned up unused MCP client: ${name}`);
    }
  }
}, ONE_MINUTE_MS);
