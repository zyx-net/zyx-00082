import { useState, useEffect } from 'react';
import { Check, X, AlertCircle, Loader2 } from 'lucide-react';
import Layout from '@/components/Layout';
import AuthorizationCard from '@/components/AuthorizationCard';
import Empty from '@/components/Empty';
import { authorizationsApi } from '@/lib/api';
import { AuthorizationWithDetails } from '@/types';

interface Toast {
  type: 'success' | 'error';
  message: string;
}

export default function GuardianApprove() {
  const [authorizations, setAuthorizations] = useState<AuthorizationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [rejectModal, setRejectModal] = useState<{
    isOpen: boolean;
    authId: number | null;
    reason: string;
  }>({
    isOpen: false,
    authId: null,
    reason: '',
  });

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      const response = await authorizationsApi.getPendingApproval();
      setAuthorizations(response.data);
    } catch (error) {
      showToast('error', '获取待审批列表失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleApprove = async (id: number) => {
    try {
      setSubmittingId(id);
      await authorizationsApi.approve(id);
      showToast('success', '审批通过成功');
      fetchPendingApprovals();
    } catch (error) {
      showToast('error', '审批通过失败');
      console.error(error);
    } finally {
      setSubmittingId(null);
    }
  };

  const handleReject = (id: number) => {
    setRejectModal({
      isOpen: true,
      authId: id,
      reason: '',
    });
  };

  const confirmReject = async () => {
    if (!rejectModal.authId || !rejectModal.reason.trim()) {
      showToast('error', '请输入拒绝原因');
      return;
    }

    try {
      setSubmittingId(rejectModal.authId);
      await authorizationsApi.reject(rejectModal.authId, rejectModal.reason.trim());
      showToast('success', '拒绝成功');
      setRejectModal({ isOpen: false, authId: null, reason: '' });
      fetchPendingApprovals();
    } catch (error) {
      showToast('error', '拒绝失败');
      console.error(error);
    } finally {
      setSubmittingId(null);
    }
  };

  const getActions = (auth: AuthorizationWithDetails) => [
    {
      label: '通过',
      icon: Check,
      onClick: () => handleApprove(auth.id),
      variant: 'success' as const,
      disabled: submittingId === auth.id,
    },
    {
      label: '拒绝',
      icon: X,
      onClick: () => handleReject(auth.id),
      variant: 'danger' as const,
      disabled: submittingId === auth.id,
    },
  ];

  return (
    <Layout>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">待我审批</h2>
        <p className="text-gray-500 mt-1">审批其他监护人提交的接送授权申请</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          <span className="ml-3 text-gray-500">加载中...</span>
        </div>
      ) : authorizations.length === 0 ? (
        <Empty />
      ) : (
        <div className="space-y-4">
          {authorizations.map((auth) => (
            <AuthorizationCard
              key={auth.id}
              auth={auth}
              actions={getActions(auth)}
              showAudit={false}
            />
          ))}
        </div>
      )}

      {toast && (
        <div
          className={`fixed top-4 right-4 flex items-center space-x-2 px-4 py-3 rounded-lg shadow-lg z-50 ${
            toast.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {toast.type === 'success' ? (
            <Check className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {rejectModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">拒绝授权申请</h3>
                <p className="text-sm text-gray-500">请输入拒绝原因</p>
              </div>
            </div>

            <textarea
              value={rejectModal.reason}
              onChange={(e) =>
                setRejectModal({ ...rejectModal, reason: e.target.value })
              }
              placeholder="请输入拒绝原因..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none h-24 text-sm"
              disabled={submittingId === rejectModal.authId}
            />

            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() =>
                  setRejectModal({ isOpen: false, authId: null, reason: '' })
                }
                disabled={submittingId === rejectModal.authId}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={confirmReject}
                disabled={submittingId === rejectModal.authId || !rejectModal.reason.trim()}
                className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                {submittingId === rejectModal.authId && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                <span>确认拒绝</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
