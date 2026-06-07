import { Router, type Request, type Response } from 'express';
import db from '../db/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getAuthorizationsWithDetails } from '../services/authorizationService.js';
import { ABNORMAL_REASON_LABELS } from '../types/index.js';
import type { AuthorizationWithDetails, AbnormalReason } from '../types/index.js';

const router = Router();

router.get('/statistics', requireAuth, requireRole('admin', 'teacher'), async (req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const stats = {
      totalChildren: (db.prepare('SELECT COUNT(*) as count FROM children').get() as { count: number }).count,
      totalGuardians: (db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('guardian') as { count: number }).count,
      totalTeachers: (db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('teacher') as { count: number }).count,
      pendingApproval: (db.prepare('SELECT COUNT(*) as count FROM authorizations WHERE status = ?').get('PENDING_APPROVAL') as { count: number }).count,
      pendingVerification: (db.prepare('SELECT COUNT(*) as count FROM authorizations WHERE status IN (?, ?)').get('APPROVED', 'PENDING_VERIFICATION') as { count: number }).count,
      completedToday: (db.prepare(`
        SELECT COUNT(*) as count FROM authorizations
        WHERE status = 'COMPLETED' AND DATE(completed_at) = ?
      `).get(today) as { count: number }).count,
      totalToday: (db.prepare(`
        SELECT COUNT(*) as count FROM authorizations
        WHERE DATE(time_window_start) = ?
      `).get(today) as { count: number }).count,
      expiredCount: (db.prepare('SELECT COUNT(*) as count FROM authorizations WHERE status = ?').get('EXPIRED') as { count: number }).count,
      rejectedCount: (db.prepare('SELECT COUNT(*) as count FROM authorizations WHERE status = ?').get('REJECTED') as { count: number }).count,
      abnormalCount: (db.prepare('SELECT COUNT(*) as count FROM authorizations WHERE status = ?').get('ABNORMAL') as { count: number }).count,
      abnormalToday: (db.prepare(`
        SELECT COUNT(*) as count FROM authorizations
        WHERE status = 'ABNORMAL' AND DATE(abnormal_at) = ?
      `).get(today) as { count: number }).count,
    };

    res.json({ success: true, data: stats });
  } catch (e) {
    res.status(500).json({ success: false, error: '获取统计数据失败' });
  }
});

router.get('/export/today', requireAuth, requireRole('admin', 'teacher'), async (req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const authorizations = getAuthorizationsWithDetails(
      'WHERE DATE(a.time_window_start) = ?',
      [today]
    );

    const csvContent = generateCSV(authorizations, today);
    const filename = encodeURIComponent(`交接清单_${today}.csv`);

    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${filename}`
    });
    res.write('\uFEFF');
    res.end(csvContent);
  } catch (e) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: '导出失败：' + (e as Error).message });
    }
  }
});

router.get('/audit-logs', requireAuth, requireRole('admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit = '100', offset = '0' } = req.query;

    const logs = db.prepare(`
      SELECT al.*, u.name as user_name,
             c.name as child_name,
             a.pickup_person_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN authorizations a ON al.authorization_id = a.id
      LEFT JOIN children c ON a.child_id = c.id
      ORDER BY al.timestamp DESC
      LIMIT ? OFFSET ?
    `).all(parseInt(limit as string), parseInt(offset as string));

    const total = (db.prepare('SELECT COUNT(*) as count FROM audit_logs').get() as { count: number }).count;

    res.json({ success: true, data: logs, total });
  } catch (e) {
    res.status(500).json({ success: false, error: '获取审计日志失败' });
  }
});

function generateCSV(authorizations: AuthorizationWithDetails[], date: string): string {
  const headers = [
    '序号',
    '儿童姓名',
    '班级',
    '申请人',
    '审批人',
    '接送人姓名',
    '接送人电话',
    '证件尾号',
    '与儿童关系',
    '接送时间窗',
    '状态',
    '核验人',
    '核验时间',
    '完成时间',
    '拒绝原因',
    '异常原因',
    '异常处理人',
    '异常处理时间',
  ];

  const rows = authorizations.map((auth, index) => {
    const statusMap: Record<string, string> = {
      PENDING_APPROVAL: '待审批',
      APPROVED: '已批准',
      REJECTED: '已拒绝',
      PENDING_VERIFICATION: '待核验',
      VERIFIED: '已核验',
      COMPLETED: '已完成',
      CANCELLED: '已撤销',
      EXPIRED: '已过期',
      ABNORMAL: '异常',
    };

    const abnormalReasonLabel = auth.abnormal_reason 
      ? ABNORMAL_REASON_LABELS[auth.abnormal_reason as AbnormalReason] 
      : '';

    return [
      index + 1,
      auth.child_name,
      auth.child_class || '',
      auth.applicant_name,
      auth.approver_name || '',
      auth.pickup_person_name,
      auth.pickup_person_phone,
      auth.pickup_person_id_last4,
      auth.pickup_relation,
      `${formatDate(auth.time_window_start)} - ${formatDate(auth.time_window_end)}`,
      statusMap[auth.status] || auth.status,
      auth.verifier_name || '',
      auth.verified_at ? formatDate(auth.verified_at) : '',
      auth.completed_at ? formatDate(auth.completed_at) : '',
      auth.reject_reason || '',
      abnormalReasonLabel,
      auth.abnormal_handler_name || '',
      auth.abnormal_at ? formatDate(auth.abnormal_at) : '',
    ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
  });

  let summary = `\n\n"当日统计","${date}"\n`;
  summary += `"待审批","${authorizations.filter(a => a.status === 'PENDING_APPROVAL').length}"\n`;
  summary += `"已批准","${authorizations.filter(a => a.status === 'APPROVED').length}"\n`;
  summary += `"待核验","${authorizations.filter(a => ['APPROVED', 'PENDING_VERIFICATION'].includes(a.status)).length}"\n`;
  summary += `"已核验","${authorizations.filter(a => a.status === 'VERIFIED').length}"\n`;
  summary += `"已完成","${authorizations.filter(a => a.status === 'COMPLETED').length}"\n`;
  summary += `"异常","${authorizations.filter(a => a.status === 'ABNORMAL').length}"\n`;
  summary += `"已拒绝","${authorizations.filter(a => a.status === 'REJECTED').length}"\n`;
  summary += `"已撤销","${authorizations.filter(a => a.status === 'CANCELLED').length}"\n`;
  summary += `"已过期","${authorizations.filter(a => a.status === 'EXPIRED').length}"\n`;
  summary += `"总计","${authorizations.length}"\n`;

  const abnormalRecords = authorizations.filter(a => a.status === 'ABNORMAL');
  if (abnormalRecords.length > 0) {
    summary += `\n"异常记录明细"\n`;
    summary += `"儿童姓名","班级","接送人","异常原因","处理人","处理时间"\n`;
    for (const auth of abnormalRecords) {
      const reasonLabel = auth.abnormal_reason 
        ? ABNORMAL_REASON_LABELS[auth.abnormal_reason as AbnormalReason] 
        : '';
      summary += [
        auth.child_name,
        auth.child_class || '',
        auth.pickup_person_name,
        reasonLabel,
        auth.abnormal_handler_name || '',
        auth.abnormal_at ? formatDate(auth.abnormal_at) : '',
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',') + '\n';
    }
  }

  return headers.join(',') + '\n' + rows.join('\n') + summary;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export default router;
