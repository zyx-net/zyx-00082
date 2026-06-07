import { useState, useEffect, useCallback } from 'react';
import { Shield, Check, X, AlertCircle, Loader2, CreditCard, User, Phone, Calendar, Clock } from 'lucide-react';
import Layout from '@/components/Layout';
import AuthorizationCard from '@/components/AuthorizationCard';
import Empty from '@/components/Empty';
import { authorizationsApi } from '@/lib/api';
import { AuthorizationWithDetails } from '@/types';

interface Toast {
  type: 'success' | 'error';
  message: string;
}

interface VerifyModal {
  isOpen: boolean;
  auth: AuthorizationWithDetails | null;
  idLast4: string;
}

export default function TeacherVerify() {
  const [authorizations, setAuthorizations] = useState<AuthorizationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [verifyModal, setVerifyModal] = useState<VerifyModal>({
    isOpen: false,
    auth: null,
    idLast4: '',
  });

  const fetchPendingVerifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authorizationsApi.getPendingVerification();
      setAuthorizations(response.data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取待核验列表失败';
      showToast('error', errorMessage);
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingVerifications();
  }, [fetchPendingVerifications]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const handleVerify = (auth: AuthorizationWithDetails) => {
    setVerifyModal({
      isOpen: true,
      auth,
      idLast4: '',
    });
  };

  const handleIdLast4Change = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '').slice(0, 4);
    setVerifyModal({ ...verifyModal, idLast4: digitsOnly });
  };

  const confirmVerify = async () => {
    if (!verifyModal.auth || verifyModal.idLast4.length !== 4) {
      showToast('error', '请输入4位证件尾号');
      return;
    }

    try {
      setSubmittingId(verifyModal.auth.id);
      await authorizationsApi.verify(verifyModal.auth.id, verifyModal.idLast4);
      showToast('success', '核验成功');
      setVerifyModal({ isOpen: false, auth: null, idLast4: '' });
      fetchPendingVerifications();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '核验失败';
      showToast('error', errorMessage);
      console.error(error);
    } finally {
      setSubmittingId(null);
    }
  };

  const handleComplete = async (id: number) => {
    try {
      setSubmittingId(id);
      await authorizationsApi.complete(id);
      showToast('success', '交接完成');
      fetchPendingVerifications();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '完成交接失败';
      showToast('error', errorMessage);
      console.error(error);
    } finally {
      setSubmittingId(null);
    }
  };

  const getActions = (auth: AuthorizationWithDetails) => {
    const actions = [];

    if (auth.status === 'PENDING_VERIFICATION') {
      actions.push({
        label: '核验',
        icon: Shield,
        onClick: () => handleVerify(auth),
        variant: 'primary' as const,
        disabled: submittingId === auth.id,
      });
    }

    if (auth.status === 'VERIFIED') {
      actions.push({
        label: '完成交接',
        icon: Check,
        onClick: () => handleComplete(auth.id),
        variant: 'success' as const,
        disabled: submittingId === auth.id,
      });
    }

    return actions;
  };

  return (
    <Layout>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">待核验</h2>
        <p className="text-gray-500 mt-1">核验接送人身份并完成交接</p>
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

      {verifyModal.isOpen && verifyModal.auth && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">核验身份</h3>
                  <p className="text-sm text-gray-500">请核对接送人信息</p>
                </div>
              </div>
              <button
                onClick={() => setVerifyModal({ isOpen: false, auth: null, idLast4: '' })}
                disabled={submittingId === verifyModal.auth?.id}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  儿童信息
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-blue-700">姓名：</span>
                    <span className="text-blue-900 font-medium">{verifyModal.auth.child_name}</span>
                  </div>
                  <div>
                    <span className="text-blue-700">班级：</span>
                    <span className="text-blue-900 font-medium">{verifyModal.auth.child_class || '未分班'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="font-medium text-orange-900 mb-2 flex items-center">
                  <Shield className="h-4 w-4 mr-2" />
                  接送人信息
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center">
                    <User className="h-4 w-4 text-orange-500 mr-2" />
                    <span className="text-orange-700">姓名：</span>
                    <span className="text-orange-900 font-medium ml-1">{verifyModal.auth.pickup_person_name}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-orange-700 w-16">关系：</span>
                    <span className="text-orange-900 font-medium">{verifyModal.auth.pickup_relation}</span>
                  </div>
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 text-orange-500 mr-2" />
                    <span className="text-orange-700">电话：</span>
                    <span className="text-orange-900 font-medium ml-1">{verifyModal.auth.pickup_person_phone}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                  <Check className="h-4 w-4 mr-2 text-green-600" />
                  审批信息
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">申请人：</span>
                    <span className="text-gray-900 font-medium">{verifyModal.auth.applicant_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">审批人：</span>
                    <span className="text-gray-900 font-medium">{verifyModal.auth.approver_name || '-'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-gray-500" />
                  接送时间窗
                </h4>
                <div className="text-sm">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-gray-600">
                      {formatDate(verifyModal.auth.time_window_start)} ~ {formatDate(verifyModal.auth.time_window_end)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <CreditCard className="h-4 w-4 inline mr-1" />
                  证件尾号
                </label>
                <input
                  type="text"
                  value={verifyModal.idLast4}
                  onChange={(e) => handleIdLast4Change(e.target.value)}
                  placeholder="请输入4位证件尾号"
                  maxLength={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg tracking-widest text-center font-mono"
                  disabled={submittingId === verifyModal.auth?.id}
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1 text-center">请核对接送人证件后输入尾号4位数字</p>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setVerifyModal({ isOpen: false, auth: null, idLast4: '' })}
                disabled={submittingId === verifyModal.auth?.id}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={confirmVerify}
                disabled={submittingId === verifyModal.auth?.id || verifyModal.idLast4.length !== 4}
                className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                {submittingId === verifyModal.auth?.id && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                <span>确认核验</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
