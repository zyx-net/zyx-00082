import db from '../db/index.js';
import type {
  Authorization,
  AuthorizationWithDetails,
  CreateAuthorizationRequest,
  User,
  Child,
} from '../types/index.js';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

const LEGAL_ID_PATTERN = /^\d{4}$/;

export function validateIdLast4(idLast4: string): ValidationResult {
  if (!LEGAL_ID_PATTERN.test(idLast4)) {
    return { valid: false, error: `证件尾号格式错误：必须为4位数字，当前输入"${idLast4}"` };
  }
  return { valid: true };
}

export function validateTimeWindow(start: string, end: string): ValidationResult {
  const startTime = new Date(start);
  const endTime = new Date(end);
  const now = new Date();

  if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
    return { valid: false, error: '时间格式错误' };
  }

  if (startTime >= endTime) {
    return { valid: false, error: '开始时间必须早于结束时间' };
  }

  if (endTime < now) {
    return { valid: false, error: '时间窗已过期，结束时间不能早于当前时间' };
  }

  const durationMs = endTime.getTime() - startTime.getTime();
  const maxDurationMs = 24 * 60 * 60 * 1000;
  if (durationMs > maxDurationMs) {
    return { valid: false, error: '时间窗过长，最长不超过24小时' };
  }

  return { valid: true };
}

export function isTimeWindowExpired(auth: Authorization): boolean {
  const now = new Date();
  const endTime = new Date(auth.time_window_end);
  return now > endTime;
}

export function checkSameDayConflict(childId: number, dateStr: string, excludeAuthId?: number): ValidationResult {
  const query = `
    SELECT COUNT(*) as count FROM authorizations
    WHERE child_id = ?
      AND DATE(time_window_start) = ?
      AND status IN ('PENDING_APPROVAL', 'APPROVED', 'PENDING_VERIFICATION', 'VERIFIED')
      ${excludeAuthId ? 'AND id != ?' : ''}
  `;

  const stmt = db.prepare(query);
  const result = excludeAuthId
    ? stmt.get(childId, dateStr, excludeAuthId) as { count: number }
    : stmt.get(childId, dateStr) as { count: number };

  if (result.count > 0) {
    const child = db.prepare('SELECT name FROM children WHERE id = ?').get(childId) as { name: string } | undefined;
    const childName = child?.name || '该儿童';
    return {
      valid: false,
      error: `同日授权冲突：${childName}在${dateStr}已有有效的接送授权，同一儿童同一日期只能有一个有效授权`,
    };
  }

  return { valid: true };
}

export function checkApprovalPermission(auth: Authorization, approver: User): ValidationResult {
  if (auth.status !== 'PENDING_APPROVAL') {
    return { valid: false, error: `当前状态"${auth.status}"不支持审批操作` };
  }

  if (approver.id === auth.applicant_id) {
    return { valid: false, error: '审批权限错误：申请人不能审批自己的授权申请，必须由另一位监护人审批' };
  }

  const child = db.prepare('SELECT guardian1_id, guardian2_id FROM children WHERE id = ?').get(auth.child_id) as Child | undefined;
  if (!child) {
    return { valid: false, error: '儿童信息不存在' };
  }

  if (approver.id !== child.guardian1_id && approver.id !== child.guardian2_id) {
    return { valid: false, error: '审批权限错误：只有该儿童的监护人才有权限审批此授权申请' };
  }

  return { valid: true };
}

export function checkVerifyPermission(auth: Authorization): ValidationResult {
  const activeStates = ['APPROVED', 'PENDING_VERIFICATION', 'VERIFIED'];
  if (!activeStates.includes(auth.status)) {
    return { valid: false, error: `当前状态"${auth.status}"不支持核验操作，需要状态为已批准或待核验` };
  }

  if (isTimeWindowExpired(auth)) {
    return { valid: false, error: '时间窗已过期，无法进行核验' };
  }

  return { valid: true };
}

export function verifyIdLast4(auth: Authorization, inputIdLast4: string): ValidationResult {
  const formatCheck = validateIdLast4(inputIdLast4);
  if (!formatCheck.valid) {
    return formatCheck;
  }

  if (inputIdLast4 !== auth.pickup_person_id_last4) {
    return {
      valid: false,
      error: `证件尾号不匹配：输入的"${inputIdLast4}"与申请时登记的"${auth.pickup_person_id_last4}"不符，请核对后重试`,
    };
  }

  return { valid: true };
}

export function checkCompletePermission(auth: Authorization): ValidationResult {
  if (auth.status !== 'VERIFIED') {
    return { valid: false, error: `当前状态"${auth.status}"不支持完成交接，必须先通过证件核验` };
  }

  if (isTimeWindowExpired(auth)) {
    return { valid: false, error: '时间窗已过期，无法完成交接' };
  }

  return { valid: true };
}

export function checkCancelPermission(auth: Authorization, user: User): ValidationResult {
  const cancellableStates = ['PENDING_APPROVAL', 'APPROVED', 'PENDING_VERIFICATION'];
  if (!cancellableStates.includes(auth.status)) {
    return { valid: false, error: `当前状态"${auth.status}"不支持撤销操作` };
  }

  if (user.role === 'guardian' && user.id !== auth.applicant_id) {
    return { valid: false, error: '撤销权限错误：只有申请人才能撤销此授权' };
  }

  return { valid: true };
}

export function expireIfNeeded(auth: Authorization): Authorization | null {
  const autoExpireStates = ['APPROVED', 'PENDING_VERIFICATION'];
  if (autoExpireStates.includes(auth.status) && isTimeWindowExpired(auth)) {
    db.prepare(`
      UPDATE authorizations
      SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(auth.id);

    db.prepare(`
      INSERT INTO audit_logs (authorization_id, user_id, action, details)
      VALUES (?, ?, 'AUTO_EXPIRE', ?)
    `).run(auth.id, 1, '系统自动检测到时间窗过期，授权已自动失效');

    return db.prepare('SELECT * FROM authorizations WHERE id = ?').get(auth.id) as Authorization;
  }
  return null;
}

export function createAuthorization(
  data: CreateAuthorizationRequest,
  applicant: User
): { success: boolean; error?: string; data?: Authorization } {
  const child = db.prepare('SELECT * FROM children WHERE id = ?').get(data.childId) as Child | undefined;
  if (!child) {
    return { success: false, error: '儿童不存在' };
  }

  if (applicant.id !== child.guardian1_id && applicant.id !== child.guardian2_id) {
    return { success: false, error: '您不是该儿童的监护人，无权为此儿童申请接送授权' };
  }

  const idCheck = validateIdLast4(data.pickupPersonIdLast4);
  if (!idCheck.valid) {
    return { success: false, error: idCheck.error };
  }

  const timeCheck = validateTimeWindow(data.timeWindowStart, data.timeWindowEnd);
  if (!timeCheck.valid) {
    return { success: false, error: timeCheck.error };
  }

  const dateStr = new Date(data.timeWindowStart).toISOString().split('T')[0];
  const conflictCheck = checkSameDayConflict(data.childId, dateStr);
  if (!conflictCheck.valid) {
    return { success: false, error: conflictCheck.error };
  }

  const tx = db.transaction(() => {
    const info = db.prepare(`
      INSERT INTO authorizations (
        child_id, applicant_id, pickup_person_name, pickup_person_phone,
        pickup_person_id_last4, pickup_relation, time_window_start, time_window_end
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.childId,
      applicant.id,
      data.pickupPersonName,
      data.pickupPersonPhone,
      data.pickupPersonIdLast4,
      data.pickupRelation,
      data.timeWindowStart,
      data.timeWindowEnd
    );

    const authId = info.lastInsertRowid as number;

    db.prepare(`
      INSERT INTO audit_logs (authorization_id, user_id, action, details)
      VALUES (?, ?, 'CREATE', ?)
    `).run(
      authId,
      applicant.id,
      `提交接送授权申请：接送人${data.pickupPersonName}，关系${data.pickupRelation}，时间${dateStr}`
    );

    return db.prepare('SELECT * FROM authorizations WHERE id = ?').get(authId) as Authorization;
  });

  try {
    const auth = tx();
    return { success: true, data: auth };
  } catch (e) {
    return { success: false, error: '创建授权失败：' + (e as Error).message };
  }
}

export function getAuthorizationsWithDetails(whereClause: string, params: unknown[] = []): AuthorizationWithDetails[] {
  const query = `
    SELECT a.*,
           c.name as child_name,
           c.class_name as child_class,
           u1.name as applicant_name,
           u2.name as approver_name,
           u3.name as verifier_name
    FROM authorizations a
    LEFT JOIN children c ON a.child_id = c.id
    LEFT JOIN users u1 ON a.applicant_id = u1.id
    LEFT JOIN users u2 ON a.approver_id = u2.id
    LEFT JOIN users u3 ON a.verified_by = u3.id
    ${whereClause}
    ORDER BY a.created_at DESC
  `;

  return db.prepare(query).all(...params) as AuthorizationWithDetails[];
}
