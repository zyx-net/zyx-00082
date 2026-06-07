import { type Request, type Response, type NextFunction } from 'express';
import db from '../db/index.js';
import type { User, UserRole } from '../types/index.js';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const userId = req.headers['x-user-id'];
  if (!userId || typeof userId !== 'string') {
    res.status(401).json({ success: false, error: '未登录，请先登录' });
    return;
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(parseInt(userId)) as User | undefined;
  if (!user) {
    res.status(401).json({ success: false, error: '用户不存在' });
    return;
  }

  req.user = user;
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未登录' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: `无权限操作，需要${roles.map(r => r === 'guardian' ? '监护人' : r === 'teacher' ? '老师' : '管理员').join('或')}角色` });
      return;
    }
    next();
  };
}

export function getClientInfo(req: Request): { ip: string; userAgent: string } {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';
  return {
    ip: Array.isArray(ip) ? ip[0] : ip,
    userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
  };
}
