import { Request, Response, NextFunction } from 'express';
import { auth } from '../../src/lib/firebaseAdmin';
import { LogTool } from '../../packages/nexus/telemetry/LogTool';

const logger = new LogTool('AuthMiddleware');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    displayName?: string;
    photoURL?: string;
    role: 'admin' | 'user';
    [key: string]: any;
  };
  logger?: LogTool;
}

export async function authenticateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const idToken = req.headers.authorization?.split('Bearer ')[1] || req.body.idToken || req.query.idToken;
  
  if (!idToken) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      displayName: decodedToken.name,
      photoURL: decodedToken.picture,
      role: decodedToken.email === ADMIN_EMAIL ? 'admin' : 'user'
    };
    
    req.logger = new LogTool('server', req.user.uid);
    next();
  } catch (error: any) {
    logger.error('Authentication failed', error);
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
}

export function authorizeAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
}
