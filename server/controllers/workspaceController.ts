import { Request, Response, NextFunction } from 'express';
import { workspaceService } from '../services/workspaceService';
import { AuthenticatedRequest } from '../../src/types/auth';
import { LogTool } from '../../packages/nexus/telemetry/LogTool';

const logger = new LogTool('workspaceController');

export const workspaceController = {
  async listWorkspaces(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      logger.info('Listing workspaces', { uid: req.user.uid, role: req.user.role });
      
      const workspaces = await workspaceService.listWorkspaces(req.user);
      
      logger.info(`Found ${workspaces.length} workspaces for user ${req.user.uid}`);
      res.json(workspaces);
    } catch (error) {
      logger.error('Failed to list workspaces', error as any);
      next(error);
    }
  }
};
