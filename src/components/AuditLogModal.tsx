import { useEffect, useState } from 'react';
import { X, Clock, User } from 'lucide-react';
import { authorizationsApi } from '../lib/api';
import type { AuditLog } from '../types';
import { ACTION_LABELS } from '../types';

interface AuditLogModalProps {
  authId: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function AuditLogModal({ authId, isOpen, onClose }: AuditLogModalProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && authId) {
      loadLogs();
    }
  }, [isOpen, authId]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const response = await authorizationsApi.getAuditLogs(authId);
      if (response.success) {
        setLogs(response.data);
      }
    } catch (e) {
      console.error('加载审计日志失败', e);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">操作轨迹</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无操作记录</div>
          ) : (
            <div className="relative">
              {logs.map((log, index) => (
                <div key={log.id} className="relative pl-8 pb-6 last:pb-0">
                  {index < logs.length - 1 && (
                    <div className="absolute left-3 top-6 bottom-0 w-0.5 bg-gray-200" />
                  )}
                  <div className="absolute left-0 top-1 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <Clock className="h-3 w-3 text-blue-600" />
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(log.timestamp)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-gray-600 mb-1">
                      <User className="h-3 w-3" />
                      <span>{log.user_name}</span>
                    </div>
                    {log.details && (
                      <p className="text-sm text-gray-600">{log.details}</p>
                    )}
                    {log.ip_address && (
                      <p className="text-xs text-gray-400 mt-1">IP: {log.ip_address}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
