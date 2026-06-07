import { Router, type Request, type Response } from 'express';
import db from '../db/index.js';
import { requireAuth, requireRole, getClientInfo } from '../middleware/auth.js';
import type { User, Authorization, AuditLog } from '../types/index.js';
import {
  createAuthorization,
  getAuthorizationsWithDetails,
  expireIfNeeded,
  checkApprovalPermission,
  checkVerifyPermission,
  verifyIdLast4,
  checkCompletePermission,
  checkCancelPermission,
  checkAbnormalPermission,
  validateIdLast4,
  validateAbnormalReason,
  getHandoffQueue,
} from '../services/authorizationService.js';
import { ABNORMAL_REASON_LABELS } from '../types/index.js';
import type { AbnormalReason } from '../types/index.js';

const router = Router();

function processExpiredAuthorizations() {
  const auths = db.prepare(`
    SELECT * FROM authorizations
    WHERE status IN ('APPROVED', 'PENDING_VERIFICATION')
  `).all() as Authorization[];

  for (const auth of auths) {
    expireIfNeeded(auth);
  }
}

router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    processExpiredAuthorizations();
    const user = req.user as User;
    const { status, childId } = req.query;

    let whereClause = 'WHERE 1=1';
    const params: unknown[] = [];

    if (user.role === 'guardian') {
      whereClause += ' AND (a.applicant_id = ? OR EXISTS (SELECT 1 FROM children c WHERE c.id = a.child_id AND (c.guardian1_id = ? OR c.guardian2_id = ?)))';
      params.push(user.id, user.id, user.id);
    }

    if (status && typeof status === 'string') {
      whereClause += ' AND a.status = ?';
      params.push(status);
    }

    if (childId && typeof childId === 'string') {
      whereClause += ' AND a.child_id = ?';
      params.push(parseInt(childId));
    }

    const authorizations = getAuthorizationsWithDetails(whereClause, params);
    res.json({ success: true, data: authorizations });
  } catch (e) {
    res.status(500).json({ success: false, error: '获取授权列表失败：' + (e as Error).message });
  }
});

router.get('/pending-approval', requireAuth, requireRole('guardian'), async (req: Request, res: Response): Promise<void> => {
  try {
    processExpiredAuthorizations();
    const user = req.user as User;

    const authorizations = getAuthorizationsWithDetails(`
      WHERE a.status = 'PENDING_APPROVAL'
        AND EXISTS (
          SELECT 1 FROM children c
          WHERE c.id = a.child_id
            AND (c.guardian1_id = ? OR c.guardian2_id = ?)
            AND c.guardian1_id != a.applicant_id
            AND c.guardian2_id != a.applicant_id
        )
    `, [user.id, user.id]);

    const filtered = authorizations.filter(auth => auth.applicant_id !== user.id);

    res.json({ success: true, data: filtered });
  } catch (e) {
    res.status(500).json({ success: false, error: '获取待审批列表失败' });
  }
});

router.get('/pending-verification', requireAuth, requireRole('teacher', 'admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    processExpiredAuthorizations();
    const authorizations = getAuthorizationsWithDetails(`
      WHERE a.status IN ('APPROVED', 'PENDING_VERIFICATION')
    `);
    res.json({ success: true, data: authorizations });
  } catch (e) {
    res.status(500).json({ success: false, error: '获取待核验列表失败' });
  }
});

router.get('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    processExpiredAuthorizations();
    const authId = parseInt(req.params.id);

    const result = getAuthorizationsWithDetails('WHERE a.id = ?', [authId]);
    if (result.length === 0) {
      res.status(404).json({ success: false, error: '授权记录不存在' });
      return;
    }

    const user = req.user as User;
    const auth = result[0];

    if (user.role === 'guardian') {
      const child = db.prepare('SELECT guardian1_id, guardian2_id FROM children WHERE id = ?').get(auth.child_id) as { guardian1_id: number; guardian2_id: number } | undefined;
      if (user.id !== auth.applicant_id && user.id !== child?.guardian1_id && user.id !== child?.guardian2_id) {
        res.status(403).json({ success: false, error: '无权限查看此授权' });
        return;
      }
    }

    res.json({ success: true, data: auth });
  } catch (e) {
    res.status(500).json({ success: false, error: '获取授权详情失败' });
  }
});

router.post('/', requireAuth, requireRole('guardian'), async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as User;
    const result = createAuthorization(req.body, user);

    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    res.status(201).json({ success: true, data: result.data });
  } catch (e) {
    res.status(500).json({ success: false, error: '创建授权失败：' + (e as Error).message });
  }
});

router.post('/:id/approve', requireAuth, requireRole('guardian'), async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as User;
    const authId = parseInt(req.params.id);
    const { ip, userAgent } = getClientInfo(req);

    const auth = db.prepare('SELECT * FROM authorizations WHERE id = ?').get(authId) as Authorization | undefined;
    if (!auth) {
      res.status(404).json({ success: false, error: '授权记录不存在' });
      return;
    }

    const permissionCheck = checkApprovalPermission(auth, user);
    if (!permissionCheck.valid) {
      res.status(400).json({ success: false, error: permissionCheck.error });
      return;
    }

    const tx = db.transaction(() => {
      db.prepare(`
        UPDATE authorizations
        SET status = 'APPROVED', approver_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(user.id, authId);

      db.prepare(`
        INSERT INTO audit_logs (authorization_id, user_id, action, details, ip_address, user_agent)
        VALUES (?, ?, 'APPROVE', ?, ?, ?)
      `).run(authId, user.id, '审批通过授权申请', ip, userAgent);
    });

    tx();

    const updated = getAuthorizationsWithDetails('WHERE a.id = ?', [authId])[0];
    res.json({ success: true, data: updated, message: '审批通过' });
  } catch (e) {
    res.status(500).json({ success: false, error: '审批失败：' + (e as Error).message });
  }
});

router.post('/:id/reject', requireAuth, requireRole('guardian'), async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as User;
    const authId = parseInt(req.params.id);
    const { reason } = req.body;
    const { ip, userAgent } = getClientInfo(req);

    const auth = db.prepare('SELECT * FROM authorizations WHERE id = ?').get(authId) as Authorization | undefined;
    if (!auth) {
      res.status(404).json({ success: false, error: '授权记录不存在' });
      return;
    }

    const permissionCheck = checkApprovalPermission(auth, user);
    if (!permissionCheck.valid) {
      res.status(400).json({ success: false, error: permissionCheck.error });
      return;
    }

    if (!reason || reason.trim().length === 0) {
      res.status(400).json({ success: false, error: '请填写拒绝原因' });
      return;
    }

    const tx = db.transaction(() => {
      db.prepare(`
        UPDATE authorizations
        SET status = 'REJECTED', approver_id = ?, reject_reason = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(user.id, reason, authId);

      db.prepare(`
        INSERT INTO audit_logs (authorization_id, user_id, action, details, ip_address, user_agent)
        VALUES (?, ?, 'REJECT', ?, ?, ?)
      `).run(authId, user.id, `拒绝授权申请，原因：${reason}`, ip, userAgent);
    });

    tx();

    const updated = getAuthorizationsWithDetails('WHERE a.id = ?', [authId])[0];
    res.json({ success: true, data: updated, message: '已拒绝' });
  } catch (e) {
    res.status(500).json({ success: false, error: '拒绝失败：' + (e as Error).message });
  }
});

router.post('/:id/verify', requireAuth, requireRole('teacher', 'admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as User;
    const authId = parseInt(req.params.id);
    const { idLast4 } = req.body;
    const { ip, userAgent } = getClientInfo(req);

    const auth = db.prepare('SELECT * FROM authorizations WHERE id = ?').get(authId) as Authorization | undefined;
    if (!auth) {
      res.status(404).json({ success: false, error: '授权记录不存在' });
      return;
    }

    processExpiredAuthorizations();
    const authReloaded = db.prepare('SELECT * FROM authorizations WHERE id = ?').get(authId) as Authorization;

    const permissionCheck = checkVerifyPermission(authReloaded);
    if (!permissionCheck.valid) {
      res.status(400).json({ success: false, error: permissionCheck.error });
      return;
    }

    const formatCheck = validateIdLast4(idLast4);
    if (!formatCheck.valid) {
      db.prepare(`
        INSERT INTO audit_logs (authorization_id, user_id, action, details, ip_address, user_agent)
        VALUES (?, ?, 'VERIFY_FAILED', ?, ?, ?)
      `).run(authId, user.id, `核验失败：${formatCheck.error}`, ip, userAgent);

      res.status(400).json({ success: false, error: formatCheck.error });
      return;
    }

    const verifyCheck = verifyIdLast4(authReloaded, idLast4);
    if (!verifyCheck.valid) {
      db.prepare(`
        INSERT INTO audit_logs (authorization_id, user_id, action, details, ip_address, user_agent)
        VALUES (?, ?, 'VERIFY_FAILED', ?, ?, ?)
      `).run(authId, user.id, `核验失败：${verifyCheck.error}`, ip, userAgent);

      res.status(400).json({ success: false, error: verifyCheck.error });
      return;
    }

    const tx = db.transaction(() => {
      db.prepare(`
        UPDATE authorizations
        SET status = 'VERIFIED', verified_by = ?, verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(user.id, authId);

      db.prepare(`
        INSERT INTO audit_logs (authorization_id, user_id, action, details, ip_address, user_agent)
        VALUES (?, ?, 'VERIFY', ?, ?, ?)
      `).run(authId, user.id, '证件核验通过，尾号匹配', ip, userAgent);
    });

    tx();

    const updated = getAuthorizationsWithDetails('WHERE a.id = ?', [authId])[0];
    res.json({ success: true, data: updated, message: '核验通过' });
  } catch (e) {
    res.status(500).json({ success: false, error: '核验失败：' + (e as Error).message });
  }
});

router.post('/:id/complete', requireAuth, requireRole('teacher', 'admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as User;
    const authId = parseInt(req.params.id);
    const { ip, userAgent } = getClientInfo(req);

    const auth = db.prepare('SELECT * FROM authorizations WHERE id = ?').get(authId) as Authorization | undefined;
    if (!auth) {
      res.status(404).json({ success: false, error: '授权记录不存在' });
      return;
    }

    processExpiredAuthorizations();
    const authReloaded = db.prepare('SELECT * FROM authorizations WHERE id = ?').get(authId) as Authorization;

    const permissionCheck = checkCompletePermission(authReloaded);
    if (!permissionCheck.valid) {
      res.status(400).json({ success: false, error: permissionCheck.error });
      return;
    }

    const tx = db.transaction(() => {
      db.prepare(`
        UPDATE authorizations
        SET status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(authId);

      db.prepare(`
        INSERT INTO audit_logs (authorization_id, user_id, action, details, ip_address, user_agent)
        VALUES (?, ?, 'COMPLETE', ?, ?, ?)
      `).run(authId, user.id, '交接完成，儿童已被接走', ip, userAgent);
    });

    tx();

    const updated = getAuthorizationsWithDetails('WHERE a.id = ?', [authId])[0];
    res.json({ success: true, data: updated, message: '交接完成' });
  } catch (e) {
    res.status(500).json({ success: false, error: '完成交接失败：' + (e as Error).message });
  }
});

router.post('/:id/cancel', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as User;
    const authId = parseInt(req.params.id);
    const { ip, userAgent } = getClientInfo(req);

    const auth = db.prepare('SELECT * FROM authorizations WHERE id = ?').get(authId) as Authorization | undefined;
    if (!auth) {
      res.status(404).json({ success: false, error: '授权记录不存在' });
      return;
    }

    const permissionCheck = checkCancelPermission(auth, user);
    if (!permissionCheck.valid) {
      res.status(400).json({ success: false, error: permissionCheck.error });
      return;
    }

    const tx = db.transaction(() => {
      db.prepare(`
        UPDATE authorizations
        SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(authId);

      db.prepare(`
        INSERT INTO audit_logs (authorization_id, user_id, action, details, ip_address, user_agent)
        VALUES (?, ?, 'CANCEL', ?, ?, ?)
      `).run(authId, user.id, `${user.role === 'admin' ? '管理员' : '申请人'}撤销授权`, ip, userAgent);
    });

    tx();

    const updated = getAuthorizationsWithDetails('WHERE a.id = ?', [authId])[0];
    res.json({ success: true, data: updated, message: '已撤销' });
  } catch (e) {
    res.status(500).json({ success: false, error: '撤销失败：' + (e as Error).message });
  }
});

router.get('/:id/audit-logs', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authId = parseInt(req.params.id);
    const user = req.user as User;

    const auth = db.prepare('SELECT * FROM authorizations WHERE id = ?').get(authId) as Authorization | undefined;
    if (!auth) {
      res.status(404).json({ success: false, error: '授权记录不存在' });
      return;
    }

    if (user.role === 'guardian') {
      const child = db.prepare('SELECT guardian1_id, guardian2_id FROM children WHERE id = ?').get(auth.child_id) as { guardian1_id: number; guardian2_id: number } | undefined;
      if (user.id !== auth.applicant_id && user.id !== child?.guardian1_id && user.id !== child?.guardian2_id) {
        res.status(403).json({ success: false, error: '无权限查看此审计记录' });
        return;
      }
    }

    const logs = db.prepare(`
      SELECT al.*, u.name as user_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.authorization_id = ?
      ORDER BY al.timestamp DESC
    `).all(authId) as Array<AuditLog & { user_name: string }>;

    res.json({ success: true, data: logs });
  } catch (e) {
    res.status(500).json({ success: false, error: '获取审计记录失败' });
  }
});

router.get('/handoff/queue', requireAuth, requireRole('teacher', 'admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    processExpiredAuthorizations();
    
    const { className, childName, pickupPersonName, idLast4 } = req.query;
    
    const filters = {
      ...(className && typeof className === 'string' ? { className } : {}),
      ...(childName && typeof childName === 'string' ? { childName } : {}),
      ...(pickupPersonName && typeof pickupPersonName === 'string' ? { pickupPersonName } : {}),
      ...(idLast4 && typeof idLast4 === 'string' ? { idLast4 } : {}),
    };

    const result = getHandoffQueue(filters);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: '获取交接队列失败：' + (e as Error).message });
  }
});

router.post('/:id/mark-abnormal', requireAuth, requireRole('teacher', 'admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as User;
    const authId = parseInt(req.params.id);
    const { reason } = req.body;
    const { ip, userAgent } = getClientInfo(req);

    const auth = db.prepare('SELECT * FROM authorizations WHERE id = ?').get(authId) as Authorization | undefined;
    if (!auth) {
      res.status(404).json({ success: false, error: '授权记录不存在' });
      return;
    }

    processExpiredAuthorizations();
    const authReloaded = db.prepare('SELECT * FROM authorizations WHERE id = ?').get(authId) as Authorization;

    const permissionCheck = checkAbnormalPermission(authReloaded);
    if (!permissionCheck.valid) {
      res.status(400).json({ success: false, error: permissionCheck.error });
      return;
    }

    if (authReloaded.status === 'CANCELLED' || authReloaded.status === 'EXPIRED') {
      res.status(400).json({ success: false, error: '被撤销或过期的记录不能再交接' });
      return;
    }

    const reasonCheck = validateAbnormalReason(reason);
    if (!reasonCheck.valid) {
      res.status(400).json({ success: false, error: reasonCheck.error });
      return;
    }

    const reasonLabel = ABNORMAL_REASON_LABELS[reason as AbnormalReason];

    const tx = db.transaction(() => {
      db.prepare(`
        UPDATE authorizations
        SET status = 'ABNORMAL', 
            abnormal_reason = ?, 
            abnormal_by = ?, 
            abnormal_at = CURRENT_TIMESTAMP, 
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(reason, user.id, authId);

      db.prepare(`
        INSERT INTO audit_logs (authorization_id, user_id, action, details, ip_address, user_agent)
        VALUES (?, ?, 'MARK_ABNORMAL', ?, ?, ?)
      `).run(authId, user.id, `标记异常：${reasonLabel}`, ip, userAgent);
    });

    tx();

    const updated = getAuthorizationsWithDetails('WHERE a.id = ?', [authId])[0];
    res.json({ success: true, data: updated, message: `已标记为异常：${reasonLabel}` });
  } catch (e) {
    res.status(500).json({ success: false, error: '标记异常失败：' + (e as Error).message });
  }
});

export default router;
