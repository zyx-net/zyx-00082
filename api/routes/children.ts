import { Router, type Request, type Response } from 'express';
import db from '../db/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import type { Child, User } from '../types/index.js';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as User;
    let children: Child[];

    if (user.role === 'guardian') {
      children = db.prepare(`
        SELECT * FROM children
        WHERE guardian1_id = ? OR guardian2_id = ?
        ORDER BY name
      `).all(user.id, user.id) as Child[];
    } else {
      children = db.prepare(`
        SELECT * FROM children ORDER BY name
      `).all() as Child[];
    }

    const childrenWithGuardians = children.map(child => {
      const guardians = db.prepare(`
        SELECT id, name, phone, role FROM users
        WHERE id = ? OR id = ?
      `).all(child.guardian1_id, child.guardian2_id) as Array<{ id: number; name: string; phone: string | null; role: string }>;
      return { ...child, guardians };
    });

    res.json({ success: true, data: childrenWithGuardians });
  } catch (e) {
    res.status(500).json({ success: false, error: '获取儿童列表失败：' + (e as Error).message });
  }
});

router.get('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const child = db.prepare('SELECT * FROM children WHERE id = ?').get(parseInt(req.params.id)) as Child | undefined;
    if (!child) {
      res.status(404).json({ success: false, error: '儿童不存在' });
      return;
    }

    const guardians = db.prepare(`
      SELECT id, name, phone, role FROM users
      WHERE id = ? OR id = ?
    `).all(child.guardian1_id, child.guardian2_id);

    res.json({ success: true, data: { ...child, guardians } });
  } catch (e) {
    res.status(500).json({ success: false, error: '获取儿童信息失败' });
  }
});

export default router;
