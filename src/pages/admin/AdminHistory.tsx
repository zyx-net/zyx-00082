import { useState, useEffect, useMemo } from 'react';
import Layout from '@/components/Layout';
import AuthorizationCard from '@/components/AuthorizationCard';
import { AuthorizationWithDetails, AuthorizationStatus, STATUS_LABELS } from '@/types';
import { authorizationsApi, adminApi } from '@/lib/api';
import {
  Loader2,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  Undo2,
  Download,
  FileText,
  AlertTriangle,
  Inbox,
} from 'lucide-react';

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

const CANCELLABLE_STATUSES: AuthorizationStatus[] = ['PENDING_APPROVAL', 'APPROVED', 'PENDING_VERIFICATION'];

export default function AdminHistory() {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [authorizations, setAuthorizations] = useState<AuthorizationWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedAuthId, setSelectedAuthId] = useState<number | null>(null);

  const fetchAuthorizations = async () => {
    setLoading(true);
    try {
      const response = await authorizationsApi.getAuthorizations();
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
    fetchAuthorizations();
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      await adminApi.exportToday();
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  const handleCancelClick = (authId: number) => {
    setSelectedAuthId(authId);
    setShowConfirmModal(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedAuthId) return;
    setCancellingId(selectedAuthId);
    try {
      const response = await authorizationsApi.cancel(selectedAuthId);
      if (response.success) {
        setAuthorizations((prev) =>
          prev.map((auth) =>
            auth.id === selectedAuthId ? response.data : auth
          )
        );
      }
    } catch (error) {
      console.error('撤销失败:', error);
      alert('撤销失败，请重试');
    } finally {
      setCancellingId(null);
      setShowConfirmModal(false);
      setSelectedAuthId(null);
    }
  };

  const statistics = useMemo(() => {
    const total = authorizations.length;
    const pendingApproval = authorizations.filter((a) => a.status === 'PENDING_APPROVAL').length;
    const pendingVerification = authorizations.filter((a) => a.status === 'PENDING_VERIFICATION').length;
    const completed = authorizations.filter((a) => a.status === 'COMPLETED').length;
    const rejected = authorizations.filter((a) => a.status === 'REJECTED').length;
    const cancelled = authorizations.filter((a) => a.status === 'CANCELLED').length;
    const expired = authorizations.filter((a) => a.status === 'EXPIRED').length;
    return { total, pendingApproval, pendingVerification, completed, rejected, cancelled, expired };
  }, [authorizations]);

  const filteredAuthorizations = useMemo(() => {
    const filter = FILTER_TABS.find((tab) => tab.key === activeFilter);
    let filtered = authorizations;
    if (filter?.value) {
      filtered = authorizations.filter((auth) => auth.status === filter.value);
    }
    if (dateFilter) {
      filtered = filtered.filter((auth) => {
        const authDate = new Date(auth.created_at).toISOString().split('T')[0];
        return authDate === dateFilter;
      });
    }
    return filtered.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [authorizations, activeFilter, dateFilter]);

  const getCardActions = (auth: AuthorizationWithDetails) => {
    if (CANCELLABLE_STATUSES.includes(auth.status)) {
      return [
        {
          label: '撤销',
          icon: Undo2,
          onClick: () => handleCancelClick(auth.id),
          variant: 'danger' as const,
          disabled: cancellingId === auth.id,
        },
      ];
    }
    return [];
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">全部记录</h1>
            <p className="text-sm text-gray-500 mt-1">
              所有授权记录一览
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting || loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span>导出今日清单</span>
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">总数</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{statistics.total}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">待审批</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">{statistics.pendingApproval}</p>
              </div>
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">待核验</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{statistics.pendingVerification}</p>
              </div>
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">已完成</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{statistics.completed}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">已拒绝</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{statistics.rejected}</p>
              </div>
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">已撤销</p>
                <p className="text-2xl font-bold text-gray-600 mt-1">{statistics.cancelled}</p>
              </div>
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <Undo2 className="h-5 w-5 text-gray-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">已过期</p>
                <p className="text-2xl font-bold text-gray-500 mt-1">{statistics.expired}</p>
              </div>
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <XCircle className="h-5 w-5 text-gray-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {dateFilter && (
                <button
                  onClick={() => setDateFilter('')}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  清除
                </button>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            <span className="ml-3 text-gray-500">加载中...</span>
          </div>
        ) : filteredAuthorizations.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-16 text-center">
            <Inbox className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无记录</h3>
            <p className="text-gray-500">
              {activeFilter === 'all' && !dateFilter
                ? '暂无授权记录'
                : '当前筛选条件下没有记录'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAuthorizations.map((auth) => (
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

      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
              确认撤销
            </h3>
            <p className="text-gray-500 text-center mb-6">
              确定要撤销这条授权记录吗？此操作无法撤销。
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setSelectedAuthId(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                取消
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={cancellingId !== null}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancellingId !== null ? (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                ) : (
                  '确认撤销'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
