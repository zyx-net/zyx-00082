import { AuthorizationWithDetails, STATUS_LABELS } from '../types';
import StatusBadge from './StatusBadge';
import { Calendar, Clock, User, Phone, Shield, X, Check, Eye } from 'lucide-react';
import { useState } from 'react';
import AuditLogModal from './AuditLogModal';

interface AuthorizationCardProps {
  auth: AuthorizationWithDetails;
  actions?: Array<{
    label: string;
    icon: typeof Check;
    onClick: () => void;
    variant: 'primary' | 'secondary' | 'danger' | 'success';
    disabled?: boolean;
  }>;
  showAudit?: boolean;
}

export default function AuthorizationCard({ auth, actions = [], showAudit = true }: AuthorizationCardProps) {
  const [showAuditModal, setShowAuditModal] = useState(false);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white',
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{auth.child_name}</h3>
              <p className="text-sm text-gray-500">{auth.child_class || '未分班'}</p>
            </div>
          </div>
          <StatusBadge status={auth.status} />
        </div>

        <div className="space-y-2 text-sm mb-4">
          <div className="flex items-center space-x-2 text-gray-600">
            <User className="h-4 w-4 text-gray-400" />
            <span>申请人：{auth.applicant_name}</span>
          </div>
          {auth.approver_name && (
            <div className="flex items-center space-x-2 text-gray-600">
              <Check className="h-4 w-4 text-green-500" />
              <span>审批人：{auth.approver_name}</span>
            </div>
          )}
          <div className="flex items-center space-x-2 text-gray-600">
            <Shield className="h-4 w-4 text-orange-500" />
            <span>接送人：{auth.pickup_person_name}（{auth.pickup_relation}）</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-600">
            <Phone className="h-4 w-4 text-gray-400" />
            <span>联系电话：{auth.pickup_person_phone}</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-600">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span>证件尾号：{auth.pickup_person_id_last4}</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-600">
            <Clock className="h-4 w-4 text-gray-400" />
            <span>接送时间：{formatDate(auth.time_window_start)} ~ {formatDate(auth.time_window_end)}</span>
          </div>
        </div>

        {auth.reject_reason && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">
              <strong>拒绝原因：</strong>{auth.reject_reason}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            创建时间：{formatDate(auth.created_at)}
          </p>
          <div className="flex items-center space-x-2">
            {showAudit && (
              <button
                onClick={() => setShowAuditModal(true)}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Eye className="h-4 w-4" />
                <span>轨迹</span>
              </button>
            )}
            {actions.map((action, idx) => (
              <button
                key={idx}
                onClick={action.onClick}
                disabled={action.disabled}
                className={`flex items-center space-x-1 px-3 py-1.5 text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[action.variant]}`}
              >
                <action.icon className="h-4 w-4" />
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {showAuditModal && (
        <AuditLogModal
          authId={auth.id}
          isOpen={showAuditModal}
          onClose={() => setShowAuditModal(false)}
        />
      )}
    </>
  );
}
