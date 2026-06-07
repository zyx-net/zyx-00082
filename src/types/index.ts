export type UserRole = 'guardian' | 'teacher' | 'admin';

export type AuthorizationStatus =
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'PENDING_VERIFICATION'
  | 'VERIFIED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface User {
  id: number;
  username: string;
  name: string;
  role: UserRole;
  phone: string | null;
  id_card_last4: string | null;
  created_at: string;
}

export interface Child {
  id: number;
  name: string;
  gender: '男' | '女';
  age: number | null;
  class_name: string | null;
  guardian1_id: number | null;
  guardian2_id: number | null;
  created_at: string;
  guardians?: Array<{ id: number; name: string; phone: string | null }>;
}

export interface AuthorizationWithDetails {
  id: number;
  child_id: number;
  applicant_id: number;
  approver_id: number | null;
  pickup_person_name: string;
  pickup_person_phone: string;
  pickup_person_id_last4: string;
  pickup_relation: string;
  time_window_start: string;
  time_window_end: string;
  status: AuthorizationStatus;
  reject_reason: string | null;
  verified_by: number | null;
  verified_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  child_name: string;
  child_class: string | null;
  applicant_name: string;
  approver_name: string | null;
  verifier_name: string | null;
}

export interface AuditLog {
  id: number;
  authorization_id: number;
  user_id: number;
  action: string;
  details: string | null;
  ip_address: string | null;
  user_agent: string | null;
  timestamp: string;
  user_name: string;
  child_name?: string;
  pickup_person_name?: string;
}

export interface Statistics {
  totalChildren: number;
  totalGuardians: number;
  totalTeachers: number;
  pendingApproval: number;
  pendingVerification: number;
  completedToday: number;
  totalToday: number;
  expiredCount: number;
  rejectedCount: number;
}

export interface CreateAuthorizationRequest {
  childId: number;
  pickupPersonName: string;
  pickupPersonPhone: string;
  pickupPersonIdLast4: string;
  pickupRelation: string;
  timeWindowStart: string;
  timeWindowEnd: string;
}

export const STATUS_LABELS: Record<AuthorizationStatus, string> = {
  PENDING_APPROVAL: '待审批',
  APPROVED: '已批准',
  REJECTED: '已拒绝',
  PENDING_VERIFICATION: '待核验',
  VERIFIED: '已核验',
  COMPLETED: '已完成',
  CANCELLED: '已撤销',
  EXPIRED: '已过期',
};

export const STATUS_COLORS: Record<AuthorizationStatus, string> = {
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  REJECTED: 'bg-red-100 text-red-800',
  PENDING_VERIFICATION: 'bg-orange-100 text-orange-800',
  VERIFIED: 'bg-cyan-100 text-cyan-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
  EXPIRED: 'bg-gray-300 text-gray-700',
};

export const ACTION_LABELS: Record<string, string> = {
  CREATE: '创建申请',
  APPROVE: '审批通过',
  REJECT: '拒绝',
  VERIFY: '核验通过',
  VERIFY_FAILED: '核验失败',
  COMPLETE: '完成交接',
  CANCEL: '撤销',
  AUTO_EXPIRE: '自动过期',
  LOGIN: '登录',
  LOGOUT: '登出',
};
