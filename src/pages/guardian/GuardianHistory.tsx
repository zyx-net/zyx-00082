import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import AuthorizationCard from '@/components/AuthorizationCard';
import { AuthorizationWithDetails, AuthorizationStatus, STATUS_LABELS } from '@/types';
import { authorizationsApi } from '@/lib/api';
import { Loader2, X, Clock, History } from 'lucide-react';

const FILTER_TABS: Array<{ key: string; label: string; value: AuthorizationStatus | undefined }> = [
  { key: 'all', label: '全部', value: undefined },
  { key: 'pending_approval', label: '待审批', value: 'PENDING_APPROVAL' },
  { key: 'approved', label: '已批准', value: 'APPROVED' },
  { key: 'rejected', label: '已拒绝', value: 'REJECTED' },
  { key: 'pending_verification', label: '待核验', value: 'PENDING_VERIFICATION' },
  { key: 'verified', label: '已核验', value: 'VERIFIED' },
  { key: 'completed', label: '已完成', value: 'COMPLETED' },
  { key: 'cancelled', label: '已撤销', value: 'CANCELLED' },
  { key: 'expired', label: '已过期', value: 'EXPIRED' },
];

const CANCELABLE_STATUSES: AuthorizationStatus[] = ['PENDING_APPROVAL', 'APPROVED', 'PENDING_VERIFICATION'];

export default function GuardianHistory() {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [authorizations, setAuthorizations] = useState<AuthorizationWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<number | null>(null);

  const fetchAuthorizations = async (status?: AuthorizationStatus) => {
    setLoading(true);
    try {
      const response = await authorizationsApi.getAuthorizations({ status });
      if (response.success) {
        setAuthorizations(response.data);
      }
    } catch (error) {
      console.error('获取授权列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const filter = FILTER_TABS.find((tab) => tab.key === activeFilter);
    fetchAuthorizations(filter?.value);
  }, [activeFilter]);

  const handleCancel = async (id: number) => {
    setCancellingId(id);
    try {
      const response = await authorizationsApi.cancel(id);
      if (response.success) {
        setAuthorizations((prev) =>
          prev.map((auth) => (auth.id === id ? response.data : auth))
        );
      }
    } catch (error) {
      console.error('撤销授权失败:', error);
      alert('撤销失败，请重试');
    } finally {
      setCancellingId(null);
      setConfirmCancelId(null);
    }
  };

  const getCardActions = (auth: AuthorizationWithDetails) => {
    if (!CANCELABLE_STATUSES.includes(auth.status)) {
      return [];
    }

    return [
      {
        label: '撤销',
        icon: X,
        onClick: () => setConfirmCancelId(auth.id),
        variant: 'danger' as const,
        disabled: cancellingId === auth.id,
      },
    ];
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">历史记录</h1>
            <p className="text-sm text-gray-500 mt-1">查看所有接送授权记录</p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <History className="h-4 w-4" />
            <span>共 {authorizations.length} 条记录</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="inline-flex flex-wrap gap-2">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeFilter === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            <span className="ml-3 text-gray-500">加载中...</span>
          </div>
        ) : authorizations.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-16 text-center">
            <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无记录</h3>
            <p className="text-gray-500">当前筛选条件下没有授权记录</p>
          </div>
        ) : (
          <div className="space-y-4">
            {authorizations.map((auth) => (
              <AuthorizationCard
                key={auth.id}
                auth={auth}
                actions={getCardActions(auth)}
                showAudit={true}
              />
            ))}
          </div>
        )}
      </div>

      {confirmCancelId !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <X className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">确认撤销</h3>
                <p className="text-sm text-gray-500">撤销后将无法恢复</p>
              </div>
            </div>
            <p className="text-gray-600 mb-6">
              您确定要撤销这条接送授权吗？撤销后该授权将立即失效。
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setConfirmCancelId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleCancel(confirmCancelId)}
                disabled={cancellingId === confirmCancelId}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                {cancellingId === confirmCancelId && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                <span>确认撤销</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
