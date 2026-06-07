export type UserRole = 'guardian' | 'teacher' | 'admin';

export type AuthorizationStatus =
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'PENDING_VERIFICATION'
  | 'VERIFIED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'ABNORMAL';

export type AbnormalReason = 'ID_MISMATCH' | 'PICKUP_PERSON_ABSENT' | 'GUARDIAN_CANCELLED';

export const ABNORMAL_REASON_LABELS: Record<AbnormalReason, string> = {
  ID_MISMATCH: '证件不符',
  PICKUP_PERSON_ABSENT: '接送人未到',
  GUARDIAN_CANCELLED: '监护人临时撤销',
};

export interface User {
  id: number;
  username: string;
  password: string;
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
}

export interface Authorization {
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
  abnormal_reason: AbnormalReason | null;
  abnormal_by: number | null;
  abnormal_at: string | null;
  verified_by: number | null;
  verified_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
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
}

export interface AuthorizationWithDetails extends Authorization {
  child_name: string;
  child_class: string | null;
  applicant_name: string;
  approver_name: string | null;
  verifier_name: string | null;
  abnormal_handler_name: string | null;
}

export interface HandoffQueueFilters {
  className?: string;
  childName?: string;
  pickupPersonName?: string;
  idLast4?: string;
}

export interface HandoffQueueGroup {
  class_name: string | null;
  time_window_start: string;
  time_window_end: string;
  authorizations: AuthorizationWithDetails[];
}

export interface HandoffQueueResponse {
  groups: HandoffQueueGroup[];
  statistics: {
    total: number;
    approved: number;
    pendingVerification: number;
    verified: number;
    abnormal: number;
    completed: number;
  };
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

export interface VerifyRequest {
  idLast4: string;
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
  ABNORMAL: '异常',
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
  ABNORMAL: 'bg-purple-100 text-purple-800',
};

export interface MarkAbnormalRequest {
  reason: AbnormalReason;
}

export interface HandoffQueueStatistics {
  total: number;
  approved: number;
  pendingVerification: number;
  verified: number;
  abnormal: number;
  completed: number;
}
