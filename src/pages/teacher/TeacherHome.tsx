import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import AuthorizationCard from '@/components/AuthorizationCard';
import { useAuthStore } from '@/store/useAuthStore';
import { adminApi, authorizationsApi } from '@/lib/api';
import type { AuthorizationWithDetails, Statistics } from '@/types';
import {
  Shield,
  CheckCircle,
  Users,
  Calendar,
  Download,
  Clock,
  Loader2,
  Inbox,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TeacherHome() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [pendingList, setPendingList] = useState<AuthorizationWithDetails[]>([]);
  const [completedList, setCompletedList] = useState<AuthorizationWithDetails[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, pendingRes, allRes] = await Promise.all([
        adminApi.getStatistics(),
        authorizationsApi.getPendingVerification(),
        authorizationsApi.getAuthorizations({ status: 'COMPLETED' }),
      ]);

      if (statsRes.success) {
        setStatistics(statsRes.data);
      }

      if (pendingRes.success) {
        setPendingList(pendingRes.data);
      }

      if (allRes.success) {
        const today = new Date().toDateString();
        const todayCompleted = allRes.data.filter((auth) => {
          const authDate = new Date(auth.completed_at || auth.updated_at).toDateString();
          return authDate === today;
        });
        setCompletedList(todayCompleted);
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

  const handleExport = async () => {
    try {
      setExporting(true);
      await adminApi.exportToday();
    } catch (error) {
      console.error('导出失败:', error);
    } finally {
      setExporting(false);
    }
  };

  const stats = [
    {
      label: '今日待核验',
      value: statistics?.pendingVerification || 0,
      icon: Shield,
      color: 'text-orange-600',
      iconBg: 'bg-orange-100',
      gradientFrom: 'from-orange-50',
      gradientTo: 'to-orange-0',
    },
    {
      label: '今日已完成',
      value: statistics?.completedToday || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      iconBg: 'bg-green-100',
      gradientFrom: 'from-green-50',
      gradientTo: 'to-green-0',
    },
    {
      label: '今日总接送',
      value: statistics?.totalToday || 0,
      icon: Calendar,
      color: 'text-blue-600',
      iconBg: 'bg-blue-100',
      gradientFrom: 'from-blue-50',
      gradientTo: 'to-blue-0',
    },
    {
      label: '儿童总数',
      value: statistics?.totalChildren || 0,
      icon: Users,
      color: 'text-purple-600',
      iconBg: 'bg-purple-100',
      gradientFrom: 'from-purple-50',
      gradientTo: 'to-purple-0',
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
            <p className="text-gray-500 mt-1">管理今日接送核验工作</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/teacher/verify')}
              className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Shield className="h-4 w-4 mr-2" />
              核验交接
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center justify-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              导出今日清单
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={cn(
                'bg-gradient-to-br rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow',
                stat.gradientFrom,
                stat.gradientTo
              )}
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

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-orange-500" />
                <h2 className="text-lg font-semibold text-gray-900">今日待核验</h2>
                <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-600 rounded-full">
                  {pendingList.length}
                </span>
              </div>
              {pendingList.length > 0 && (
                <button
                  onClick={() => navigate('/teacher/verify')}
                  className="flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  查看全部
                  <ChevronRight className="h-4 w-4 ml-1" />
                </button>
              )}
            </div>
            <div className="p-4">
              {pendingList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Inbox className="h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-gray-500">今日暂无待核验的接送授权</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingList.slice(0, 5).map((auth) => (
                    <AuthorizationCard
                      key={auth.id}
                      auth={auth}
                      actions={[
                        {
                          label: '去核验',
                          icon: Shield,
                          onClick: () => navigate('/teacher/verify'),
                          variant: 'primary' as const,
                        },
                      ]}
                      showAudit={true}
                    />
                  ))}
                  {pendingList.length > 5 && (
                    <div className="text-center pt-2">
                      <button
                        onClick={() => navigate('/teacher/verify')}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        查看全部 {pendingList.length} 条待核验记录
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <h2 className="text-lg font-semibold text-gray-900">今日已完成</h2>
                <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-600 rounded-full">
                  {completedList.length}
                </span>
              </div>
              {completedList.length > 0 && (
                <button
                  onClick={() => navigate('/teacher/history')}
                  className="flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  查看全部
                  <ChevronRight className="h-4 w-4 ml-1" />
                </button>
              )}
            </div>
            <div className="p-4">
              {completedList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Inbox className="h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-gray-500">今日暂无已完成的接送记录</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {completedList.slice(0, 5).map((auth) => (
                    <AuthorizationCard
                      key={auth.id}
                      auth={auth}
                      actions={[]}
                      showAudit={true}
                    />
                  ))}
                  {completedList.length > 5 && (
                    <div className="text-center pt-2">
                      <button
                        onClick={() => navigate('/teacher/history')}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        查看全部 {completedList.length} 条已完成记录
                      </button>
                    </div>
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
