import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import AuthorizationCard from '@/components/AuthorizationCard';
import { useAuthStore } from '@/store/useAuthStore';
import { childrenApi, authorizationsApi } from '@/lib/api';
import type { AuthorizationWithDetails } from '@/types';
import {
  Users,
  Clock,
  FileText,
  CalendarCheck,
  Plus,
  Check,
  X,
  Loader2,
  Inbox,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type TabType = 'pending' | 'applied';

export default function GuardianHome() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [loading, setLoading] = useState(true);
  const [childrenCount, setChildrenCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [appliedCount, setAppliedCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState<AuthorizationWithDetails[]>([]);
  const [myApplications, setMyApplications] = useState<AuthorizationWithDetails[]>([]);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectAuthId, setRejectAuthId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [childrenRes, pendingRes, allRes] = await Promise.all([
        childrenApi.getChildren(),
        authorizationsApi.getPendingApproval(),
        authorizationsApi.getAuthorizations(),
      ]);

      if (childrenRes.success) {
        setChildrenCount(childrenRes.data.length);
      }

      if (pendingRes.success) {
        setPendingApprovals(pendingRes.data);
        setPendingCount(pendingRes.data.length);
      }

      if (allRes.success) {
        const myApps = allRes.data.filter(
          (auth) => auth.applicant_id === user?.id
        );
        setMyApplications(myApps);
        setAppliedCount(myApps.length);

        const today = new Date().toDateString();
        const todayPickups = allRes.data.filter((auth) => {
          const authDate = new Date(auth.time_window_start).toDateString();
          return authDate === today;
        });
        setTodayCount(todayPickups.length);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const handleApprove = async (id: number) => {
    try {
      setActionLoading(id);
      const res = await authorizationsApi.approve(id);
      if (res.success) {
        await loadData();
      }
    } catch (error) {
      console.error('审批失败:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectClick = (id: number) => {
    setRejectAuthId(id);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectAuthId || !rejectReason.trim()) return;
    try {
      setActionLoading(rejectAuthId);
      const res = await authorizationsApi.reject(rejectAuthId, rejectReason.trim());
      if (res.success) {
        setShowRejectModal(false);
        setRejectAuthId(null);
        setRejectReason('');
        await loadData();
      }
    } catch (error) {
      console.error('拒绝失败:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const stats = [
    {
      label: '我的孩子',
      value: childrenCount,
      icon: Users,
      color: 'bg-blue-50 text-blue-600',
      iconBg: 'bg-blue-100',
    },
    {
      label: '待审批',
      value: pendingCount,
      icon: Clock,
      color: 'bg-yellow-50 text-yellow-600',
      iconBg: 'bg-yellow-100',
    },
    {
      label: '我申请的',
      value: appliedCount,
      icon: FileText,
      color: 'bg-green-50 text-green-600',
      iconBg: 'bg-green-100',
    },
    {
      label: '今日接送',
      value: todayCount,
      icon: CalendarCheck,
      color: 'bg-purple-50 text-purple-600',
      iconBg: 'bg-purple-100',
    },
  ];

  const tabs = [
    { key: 'pending' as TabType, label: '待我审批', count: pendingCount },
    { key: 'applied' as TabType, label: '我的申请', count: appliedCount },
  ];

  const getActions = (auth: AuthorizationWithDetails) => {
    if (activeTab === 'pending') {
      return [
        {
          label: '批准',
          icon: Check,
          onClick: () => handleApprove(auth.id),
          variant: 'success' as const,
          disabled: actionLoading === auth.id,
        },
        {
          label: '拒绝',
          icon: X,
          onClick: () => handleRejectClick(auth.id),
          variant: 'danger' as const,
          disabled: actionLoading === auth.id,
        },
      ];
    }
    return [];
  };

  const currentList = activeTab === 'pending' ? pendingApprovals : myApplications;

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              欢迎回来，{user?.name}
            </h1>
            <p className="text-gray-500 mt-1">管理您的孩子接送授权</p>
          </div>
          <button
            onClick={() => navigate('/guardian/apply')}
            className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="h-4 w-4 mr-2" />
            申请授权
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {stat.value}
                  </p>
                </div>
                <div className={cn('p-3 rounded-lg', stat.iconBg)}>
                  <stat.icon className={cn('h-6 w-6', stat.color)} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                    activeTab === tab.key
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  )}
                >
                  {tab.label}
                  <span
                    className={cn(
                      'ml-2 px-2 py-0.5 text-xs rounded-full',
                      activeTab === tab.key
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-gray-100 text-gray-600'
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-4">
            {currentList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Inbox className="h-12 w-12 text-gray-300 mb-3" />
                <p className="text-gray-500">
                  {activeTab === 'pending' ? '暂无待审批的授权' : '暂无申请记录'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {currentList.map((auth) => (
                  <AuthorizationCard
                    key={auth.id}
                    auth={auth}
                    actions={getActions(auth)}
                    showAudit={true}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">拒绝授权</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                拒绝原因
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="请输入拒绝原因"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={4}
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectAuthId(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={!rejectReason.trim() || actionLoading === rejectAuthId}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {actionLoading === rejectAuthId && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                确认拒绝
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
