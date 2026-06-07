import { Router, type Request, type Response } from 'express';
import db from '../db/index.js';
import type { User } from '../types/index.js';
import { getClientInfo } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ success: false, error: '请输入用户名和密码' });
      return;
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as User | undefined;

    if (!user) {
      res.status(401).json({ success: false, error: '用户不存在' });
      return;
    }

    if (user.password !== password) {
      res.status(401).json({ success: false, error: '密码错误' });
      return;
    }

    const { ip, userAgent } = getClientInfo(req);

    db.prepare(`
      INSERT INTO audit_logs (authorization_id, user_id, action, details, ip_address, user_agent)
      VALUES (NULL, ?, 'LOGIN', ?, ?, ?)
    `).run(user.id, `用户登录成功`, ip, userAgent);

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: {
        user: userWithoutPassword,
        token: String(user.id),
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: '登录失败：' + (e as Error).message });
  }
});

router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'];
    if (userId) {
      const { ip, userAgent } = getClientInfo(req);
      db.prepare(`
        INSERT INTO audit_logs (authorization_id, user_id, action, details, ip_address, user_agent)
        VALUES (NULL, ?, 'LOGOUT', ?, ?, ?)
      `).run(parseInt(userId as string), `用户登出`, ip, userAgent);
    }
    res.json({ success: true, message: '登出成功' });
  } catch (e) {
    res.status(500).json({ success: false, error: '登出失败' });
  }
});

router.get('/me', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId || typeof userId !== 'string') {
      res.status(401).json({ success: false, error: '未登录' });
      return;
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(parseInt(userId)) as User | undefined;
    if (!user) {
      res.status(401).json({ success: false, error: '用户不存在' });
      return;
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json({ success: true, data: userWithoutPassword });
  } catch (e) {
    res.status(500).json({ success: false, error: '获取用户信息失败' });
  }
});

export default router;
