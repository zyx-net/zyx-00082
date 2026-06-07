import { useEffect, useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { adminApi } from '@/lib/api';
import type { AuditLog } from '@/types';
import { ACTION_LABELS } from '@/types';
import {
  Clock,
  User,
  Monitor,
  ChevronLeft,
  ChevronRight,
  History,
  Search,
  Loader2,
  Inbox,
} from 'lucide-react';

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-blue-100 text-blue-800',
  APPROVE: 'bg-green-100 text-green-800',
  REJECT: 'bg-red-100 text-red-800',
  VERIFY: 'bg-cyan-100 text-cyan-800',
  VERIFY_FAILED: 'bg-orange-100 text-orange-800',
  COMPLETE: 'bg-emerald-100 text-emerald-800',
  CANCEL: 'bg-gray-100 text-gray-800',
  AUTO_EXPIRE: 'bg-gray-200 text-gray-700',
  LOGIN: 'bg-purple-100 text-purple-800',
  LOGOUT: 'bg-fuchsia-100 text-fuchsia-800',
};

const PAGE_SIZE = 20;

const FILTER_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'CREATE', label: '创建申请' },
  { value: 'APPROVE', label: '审批通过' },
  { value: 'REJECT', label: '拒绝' },
  { value: 'VERIFY', label: '核验通过' },
  { value: 'VERIFY_FAILED', label: '核验失败' },
  { value: 'COMPLETE', label: '完成交接' },
  { value: 'CANCEL', label: '撤销' },
  { value: 'AUTO_EXPIRE', label: '自动过期' },
  { value: 'LOGIN', label: '登录' },
  { value: 'LOGOUT', label: '登出' },
];

export default function AdminAudit() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterAction, setFilterAction] = useState('');
  const [searchText, setSearchText] = useState('');

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const loadData = async () => {
    try {
      setLoading(true);
      const offset = (currentPage - 1) * PAGE_SIZE;
      const response = await adminApi.getAllAuditLogs(PAGE_SIZE, offset);
      if (response.success) {
        setLogs(response.data.logs);
        setTotal(response.data.total);
      }
    } catch (error) {
      console.error('加载审计日志失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentPage]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesAction = filterAction ? log.action === filterAction : true;
      const matchesSearch = searchText
        ? log.user_name.includes(searchText) ||
          log.details?.includes(searchText) ||
          log.ip_address?.includes(searchText)
        : true;
      return matchesAction && matchesSearch;
    });
  }, [logs, filterAction, searchText]);

  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getActionColor = (action: string) => {
    return ACTION_COLORS[action] || 'bg-gray-100 text-gray-800';
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

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
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <History className="h-6 w-6 mr-2 text-gray-700" />
              审计日志
            </h1>
            <p className="text-gray-500 mt-1">查看系统所有操作记录</p>
          </div>
          <div className="text-sm text-gray-500">
            共 <span className="font-semibold text-gray-900">{total}</span> 条记录
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索操作人、操作内容或IP地址..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                />
              </div>
              <div className="sm:w-48">
                <select
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white"
                >
                  {FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Inbox className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500">暂无审计日志记录</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          时间
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          操作人
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        操作类型
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        操作内容
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Monitor className="h-3 w-3" />
                          IP地址
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                          {formatDateTime(log.timestamp)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium whitespace-nowrap">
                          {log.user_name}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(
                              log.action
                            )}`}
                          >
                            {ACTION_LABELS[log.action] || log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                          {log.details || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap font-mono">
                          {log.ip_address || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-500">
                  显示第 {(currentPage - 1) * PAGE_SIZE + 1} -{' '}
                  {Math.min(currentPage * PAGE_SIZE, total)} 条，共 {total} 条
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    上一页
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`w-8 h-8 text-sm font-medium rounded-lg transition-colors ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    下一页
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
