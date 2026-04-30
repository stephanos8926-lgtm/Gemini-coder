import { Request, Response } from 'express';
import path from 'path';
import { ProjectContextEngine } from '../../src/utils/ProjectContextEngine';
import { SymbolGraph } from '../../src/lib/symbolGraph';
import { LogTool } from '../../packages/nexus/telemetry/LogTool';

const logger = new LogTool('ContextController');

export class ContextController {
  public static async getRelevant(req: Request, res: Response) {
    try {
      const { query, limit, skillContext, clientContext, workspace } = req.body;
      const user = (req as any).user;
      
      const tenant = { userId: user.uid, workspaceId: workspace || 'default' };
      const engine = ProjectContextEngine.getInstance(tenant);
      const results = await engine.getRelevantContext(query, limit, skillContext, clientContext);
      
      res.json({ results });
    } catch (error: any) {
      logger.error('Failed to get context', error);
      res.status(500).json({ error: error.message });
    }
  }

  public static async getStats(req: Request, res: Response) {
    try {
      const workspace = (req.query.workspace as string) || (req as any).user.uid;
      const tenant = { userId: (req as any).user.uid, workspaceId: workspace };
      const symbols = SymbolGraph.getInstance(tenant);

      res.json({
        stats: symbols.getIndexStats(),
        recentSymbols: symbols.getRecentSymbols(15)
      });
    } catch (error: any) {
      logger.error('Failed to get context stats', error);
      res.status(500).json({ error: error.message });
    }
  }

  public static async indexWorkspace(req: Request, res: Response) {
    try {
      const { workspace } = req.body;
      const user = (req as any).user;
      const WORKSPACE_ROOT = path.join(process.cwd(), 'workspaces');
      const root = workspace ? path.join(WORKSPACE_ROOT, workspace) : path.join(WORKSPACE_ROOT, user.uid);
      
      const tenant = { userId: user.uid, workspaceId: workspace || 'default' };
      ProjectContextEngine.getInstance(tenant).indexProject(root).catch(err => {
        logger.error('Background indexing failed', err);
      });
      
      res.json({ status: 'indexing_started' });
    } catch (error: any) {
      logger.error('Failed to start indexing', error);
      res.status(500).json({ error: error.message });
    }
  }
}
