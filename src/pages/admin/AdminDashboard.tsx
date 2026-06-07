import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import AuthorizationCard from '@/components/AuthorizationCard';
import { useAuthStore } from '@/store/useAuthStore';
import { adminApi, authorizationsApi } from '@/lib/api';
import type { Statistics, AuthorizationWithDetails } from '@/types';
import {
  Users,
  Shield,
  Clock,
  CheckCircle,
  FileText,
  AlertTriangle,
  XCircle,
  Download,
  History,
  Loader2,
  Inbox,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [pendingVerification, setPendingVerification] = useState<AuthorizationWithDetails[]>([]);
  const [pendingApproval, setPendingApproval] = useState<AuthorizationWithDetails[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, verifyRes, approvalRes] = await Promise.all([
        adminApi.getStatistics(),
        authorizationsApi.getPendingVerification(),
        authorizationsApi.getAuthorizations({ status: 'PENDING_APPROVAL' }),
      ]);

      if (statsRes.success) {
        setStatistics(statsRes.data);
      }
      if (verifyRes.success) {
        setPendingVerification(verifyRes.data);
      }
      if (approvalRes.success) {
        setPendingApproval(approvalRes.data);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExportToday = async () => {
    try {
      setExportLoading(true);
      await adminApi.exportToday();
    } catch (error) {
      console.error('导出失败:', error);
    } finally {
      setExportLoading(false);
    }
  };

  const statCards = [
    {
      label: '儿童总数',
      value: statistics?.totalChildren ?? 0,
      icon: Users,
      color: 'text-blue-600',
      iconBg: 'bg-blue-100',
      borderColor: 'border-l-blue-500',
    },
    {
      label: '监护人数',
      value: statistics?.totalGuardians ?? 0,
      icon: Shield,
      color: 'text-green-600',
      iconBg: 'bg-green-100',
      borderColor: 'border-l-green-500',
    },
    {
      label: '老师数',
      value: statistics?.totalTeachers ?? 0,
      icon: Users,
      color: 'text-purple-600',
      iconBg: 'bg-purple-100',
      borderColor: 'border-l-purple-500',
    },
    {
      label: '待审批',
      value: statistics?.pendingApproval ?? 0,
      icon: Clock,
      color: 'text-yellow-600',
      iconBg: 'bg-yellow-100',
      borderColor: 'border-l-yellow-500',
    },
    {
      label: '待核验',
      value: statistics?.pendingVerification ?? 0,
      icon: AlertTriangle,
      color: 'text-orange-600',
      iconBg: 'bg-orange-100',
      borderColor: 'border-l-orange-500',
    },
    {
      label: '今日完成',
      value: statistics?.completedToday ?? 0,
      icon: CheckCircle,
      color: 'text-emerald-600',
      iconBg: 'bg-emerald-100',
      borderColor: 'border-l-emerald-500',
    },
    {
      label: '今日总计',
      value: statistics?.totalToday ?? 0,
      icon: FileText,
      color: 'text-cyan-600',
      iconBg: 'bg-cyan-100',
      borderColor: 'border-l-cyan-500',
    },
    {
      label: '已过期',
      value: statistics?.expiredCount ?? 0,
      icon: XCircle,
      color: 'text-gray-600',
      iconBg: 'bg-gray-100',
      borderColor: 'border-l-gray-500',
    },
    {
      label: '已拒绝',
      value: statistics?.rejectedCount ?? 0,
      icon: XCircle,
      color: 'text-red-600',
      iconBg: 'bg-red-100',
      borderColor: 'border-l-red-500',
    },
  ];

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
            <p className="text-gray-500 mt-1">系统管理员仪表盘，概览全局数据</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleExportToday}
              disabled={exportLoading}
              className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exportLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              导出今日清单
            </button>
            <button
              onClick={() => navigate('/admin/audit')}
              className="inline-flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              <History className="h-4 w-4 mr-2" />
              查看审计日志
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {statCards.map((stat) => (
            <div
              key={stat.label}
              className={cn(
                'bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow border-l-4',
                stat.borderColor
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {stat.value}
                  </p>
                </div>
                <div className={cn('p-2 rounded-lg', stat.iconBg)}>
                  <stat.icon className={cn('h-5 w-5', stat.color)} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <AlertTriangle className="h-5 w-5 text-orange-500 mr-2" />
                  待核验
                  <span className="ml-2 px-2 py-0.5 text-xs bg-orange-100 text-orange-600 rounded-full">
                    {pendingVerification.length}
                  </span>
                </h2>
                <button
                  onClick={() => navigate('/admin/verify')}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  查看全部
                </button>
              </div>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              {pendingVerification.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Inbox className="h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-gray-500">暂无待核验的授权</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingVerification.slice(0, 3).map((auth) => (
                    <AuthorizationCard
                      key={auth.id}
                      auth={auth}
                      actions={[]}
                      showAudit={true}
                    />
                  ))}
                  {pendingVerification.length > 3 && (
                    <p className="text-center text-sm text-gray-500">
                      还有 {pendingVerification.length - 3} 条待核验记录
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Clock className="h-5 w-5 text-yellow-500 mr-2" />
                  待审批
                  <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-600 rounded-full">
                    {pendingApproval.length}
                  </span>
                </h2>
                <button
                  onClick={() => navigate('/admin/history')}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  查看全部
                </button>
              </div>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              {pendingApproval.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Inbox className="h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-gray-500">暂无待审批的授权</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingApproval.slice(0, 3).map((auth) => (
                    <AuthorizationCard
                      key={auth.id}
                      auth={auth}
                      actions={[]}
                      showAudit={true}
                    />
                  ))}
                  {pendingApproval.length > 3 && (
                    <p className="text-center text-sm text-gray-500">
                      还有 {pendingApproval.length - 3} 条待审批记录
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
