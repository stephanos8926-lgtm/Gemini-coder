import { Router, Request, Response } from 'express';
import { AuthenticatedRequest } from '../../server';
import { LogTool } from '../utils/LogTool';
import { telemetryAggregator } from './TelemetryAggregator';
import { getAiInsights } from './AIInsightsEngine';

const router = Router();
const logger = new LogTool('AdminRouter');

// Middleware to authorize admin access
export const authorizeAdmin = (req: AuthenticatedRequest, res: Response, next: any) => {
  if (req.user?.role !== 'admin') {
    logger.warn('Unauthorized admin access attempt', { uid: req.user?.uid });
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Apply admin authorization to all routes in this router
router.use(authorizeAdmin);

// Admin Telemetry Endpoint
router.get('/telemetry', async (req: AuthenticatedRequest, res: Response) => {
  res.json(telemetryAggregator.getMetrics());
});

// Admin Insights Endpoint
router.get('/insights', async (req: AuthenticatedRequest, res: Response) => {
  const insights = await getAiInsights(telemetryAggregator.getMetrics());
  res.json({ insights });
});

// Admin Logs Endpoint
router.get('/logs', async (req: AuthenticatedRequest, res: Response) => {
  // Placeholder for log retrieval
  res.json({ status: 'ok', logs: 'Logs will be retrieved here' });
});

export default router;
