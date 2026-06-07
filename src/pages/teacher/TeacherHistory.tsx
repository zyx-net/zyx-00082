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
} from 'lucide-react';

const FILTER_TABS: Array<{ key: string; label: string; value: AuthorizationStatus | undefined }> = [
  { key: 'all', label: '全部', value: undefined },
  { key: 'pending_verification', label: '待核验', value: 'PENDING_VERIFICATION' },
  { key: 'verified', label: '已核验', value: 'VERIFIED' },
  { key: 'completed', label: '已完成', value: 'COMPLETED' },
  { key: 'rejected', label: '已拒绝', value: 'REJECTED' },
  { key: 'cancelled', label: '已撤销', value: 'CANCELLED' },
  { key: 'expired', label: '已过期', value: 'EXPIRED' },
];

const isToday = (dateStr: string): boolean => {
  const date = new Date(dateStr);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
};

export default function TeacherHistory() {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [authorizations, setAuthorizations] = useState<AuthorizationWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchAuthorizations = async () => {
    setLoading(true);
    try {
      const response = await authorizationsApi.getAuthorizations();
      if (response.success) {
        const todayRecords = response.data.filter((auth) => isToday(auth.time_window_start));
        setAuthorizations(todayRecords);
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

  const statistics = useMemo(() => {
    const total = authorizations.length;
    const completed = authorizations.filter((a) => a.status === 'COMPLETED').length;
    const pendingVerification = authorizations.filter((a) => a.status === 'PENDING_VERIFICATION').length;
    const rejected = authorizations.filter((a) => a.status === 'REJECTED').length;
    const cancelled = authorizations.filter((a) => a.status === 'CANCELLED').length;
    return { total, completed, pendingVerification, rejected, cancelled };
  }, [authorizations]);

  const filteredAuthorizations = useMemo(() => {
    const filter = FILTER_TABS.find((tab) => tab.key === activeFilter);
    let filtered = authorizations;
    if (filter?.value) {
      filtered = authorizations.filter((auth) => auth.status === filter.value);
    }
    return filtered.sort(
      (a, b) => new Date(b.time_window_start).getTime() - new Date(a.time_window_start).getTime()
    );
  }, [authorizations, activeFilter]);

  const formatToday = () => {
    const today = new Date();
    return `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">今日记录</h1>
            <p className="text-sm text-gray-500 mt-1 flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              {formatToday()} 所有交接记录
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

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">今日总数</p>
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
                <p className="text-sm text-gray-500">待核验</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{statistics.pendingVerification}</p>
              </div>
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <Clock className="h-5 w-5 text-orange-600" />
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
        ) : filteredAuthorizations.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-16 text-center">
            <AlertTriangle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无记录</h3>
            <p className="text-gray-500">
              {activeFilter === 'all'
                ? '今日暂无交接记录'
                : `当前筛选条件下没有${STATUS_LABELS[FILTER_TABS.find((t) => t.key === activeFilter)?.value as AuthorizationStatus] || ''}记录`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAuthorizations.map((auth) => (
              <AuthorizationCard
                key={auth.id}
                auth={auth}
                actions={[]}
                showAudit={true}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
