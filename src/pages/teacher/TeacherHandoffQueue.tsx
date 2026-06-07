import { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Check,
  X,
  AlertCircle,
  Loader2,
  CreditCard,
  User,
  Phone,
  Calendar,
  Clock,
  Search,
  Filter,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock3,
  Ban,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import Layout from '@/components/Layout';
import AuditLogModal from '@/components/AuditLogModal';
import Empty from '@/components/Empty';
import { authorizationsApi } from '@/lib/api';
import {
  AuthorizationWithDetails,
  HandoffQueueResponse,
  HandoffQueueGroup,
  HandoffQueueFilters,
  STATUS_LABELS,
  STATUS_COLORS,
  ABNORMAL_REASON_LABELS,
  AbnormalReason,
} from '@/types';
import { cn } from '@/lib/utils';

interface Toast {
  type: 'success' | 'error';
  message: string;
}

interface VerifyModal {
  isOpen: boolean;
  auth: AuthorizationWithDetails | null;
  idLast4: string;
}

interface AbnormalModal {
  isOpen: boolean;
  auth: AuthorizationWithDetails | null;
  reason: AbnormalReason | '';
}

interface ExpandedGroup {
  [key: string]: boolean;
}

export default function TeacherHandoffQueue() {
  const [queueData, setQueueData] = useState<HandoffQueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<ExpandedGroup>({});

  const [filters, setFilters] = useState<HandoffQueueFilters>({
    className: '',
    childName: '',
    pickupPersonName: '',
    idLast4: '',
  });

  const [verifyModal, setVerifyModal] = useState<VerifyModal>({
    isOpen: false,
    auth: null,
    idLast4: '',
  });

  const [abnormalModal, setAbnormalModal] = useState<AbnormalModal>({
    isOpen: false,
    auth: null,
    reason: '',
  });

  const [auditModal, setAuditModal] = useState<{
    isOpen: boolean;
    authId: number | null;
  }>({
    isOpen: false,
    authId: null,
  });

  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authorizationsApi.getHandoffQueue(filters);
      setQueueData(response.data);

      const newExpanded: ExpandedGroup = {};
      response.data.groups.forEach((group, idx) => {
        const key = `${group.class_name || '未分班'}_${group.time_window_start}_${group.time_window_end}`;
        newExpanded[key] = idx < 3;
      });
      setExpandedGroups(newExpanded);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取交接队列失败';
      showToast('error', errorMessage);
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const handleFilterChange = (key: keyof HandoffQueueFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      className: '',
      childName: '',
      pickupPersonName: '',
      idLast4: '',
    });
  };

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
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
      showToast('success', '核验通过');
      setVerifyModal({ isOpen: false, auth: null, idLast4: '' });
      fetchQueue();
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
      fetchQueue();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '完成交接失败';
      showToast('error', errorMessage);
      console.error(error);
    } finally {
      setSubmittingId(null);
    }
  };

  const handleMarkAbnormal = (auth: AuthorizationWithDetails) => {
    setAbnormalModal({
      isOpen: true,
      auth,
      reason: '',
    });
  };

  const confirmMarkAbnormal = async () => {
    if (!abnormalModal.auth || !abnormalModal.reason) {
      showToast('error', '请选择异常原因');
      return;
    }

    try {
      setSubmittingId(abnormalModal.auth.id);
      await authorizationsApi.markAbnormal(abnormalModal.auth.id, abnormalModal.reason);
      showToast('success', `已标记为异常：${ABNORMAL_REASON_LABELS[abnormalModal.reason]}`);
      setAbnormalModal({ isOpen: false, auth: null, reason: '' });
      fetchQueue();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '标记异常失败';
      showToast('error', errorMessage);
      console.error(error);
    } finally {
      setSubmittingId(null);
    }
  };

  const getActions = (auth: AuthorizationWithDetails) => {
    const actions = [];

    if (auth.status === 'APPROVED' || auth.status === 'PENDING_VERIFICATION') {
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

    if (['APPROVED', 'PENDING_VERIFICATION', 'VERIFIED'].includes(auth.status)) {
      actions.push({
        label: '标记异常',
        icon: AlertTriangle,
        onClick: () => handleMarkAbnormal(auth),
        variant: 'danger' as const,
        disabled: submittingId === auth.id,
      });
    }

    return actions;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return <CheckCircle className="h-4 w-4 text-cyan-500" />;
      case 'PENDING_VERIFICATION':
      case 'APPROVED':
        return <Clock3 className="h-4 w-4 text-orange-500" />;
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'ABNORMAL':
        return <AlertTriangle className="h-4 w-4 text-purple-500" />;
      case 'CANCELLED':
      case 'EXPIRED':
        return <Ban className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getGroupKey = (group: HandoffQueueGroup) => {
    return `${group.class_name || '未分班'}_${group.time_window_start}_${group.time_window_end}`;
  };

  const statsCards = queueData
    ? [
        {
          label: '今日总接送',
          value: queueData.statistics.total,
          icon: Users,
          color: 'text-blue-600',
          iconBg: 'bg-blue-100',
          gradientFrom: 'from-blue-50',
          gradientTo: 'to-blue-0',
        },
        {
          label: '待核验',
          value: queueData.statistics.pendingVerification + queueData.statistics.approved,
          icon: Clock3,
          color: 'text-orange-600',
          iconBg: 'bg-orange-100',
          gradientFrom: 'from-orange-50',
          gradientTo: 'to-orange-0',
        },
        {
          label: '已核验待交接',
          value: queueData.statistics.verified,
          icon: Shield,
          color: 'text-cyan-600',
          iconBg: 'bg-cyan-100',
          gradientFrom: 'from-cyan-50',
          gradientTo: 'to-cyan-0',
        },
        {
          label: '已完成',
          value: queueData.statistics.completed,
          icon: CheckCircle,
          color: 'text-green-600',
          iconBg: 'bg-green-100',
          gradientFrom: 'from-green-50',
          gradientTo: 'to-green-0',
        },
        {
          label: '异常',
          value: queueData.statistics.abnormal,
          icon: AlertTriangle,
          color: 'text-purple-600',
          iconBg: 'bg-purple-100',
          gradientFrom: 'from-purple-50',
          gradientTo: 'to-purple-0',
        },
      ]
    : [];

  const abnormalReasons: Array<{ value: AbnormalReason; label: string; icon: typeof AlertTriangle }> = [
    { value: 'ID_MISMATCH', label: '证件不符', icon: X },
    { value: 'PICKUP_PERSON_ABSENT', label: '接送人未到', icon: Users },
    { value: 'GUARDIAN_CANCELLED', label: '监护人临时撤销', icon: Ban },
  ];

  const hasActiveFilters = Object.values(filters).some((v) => v && v.length > 0);

  if (loading && !queueData) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-500">加载中...</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">放学交接队列</h1>
            <p className="text-gray-500 mt-1">按班级和时间窗集中管理，快速完成核验交接</p>
          </div>
          <button
            onClick={fetchQueue}
            disabled={loading}
            className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Clock className="h-4 w-4 mr-2" />
            )}
            刷新队列
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center mb-4">
            <Filter className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="font-medium text-gray-900">筛选条件</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">班级</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.className}
                  onChange={(e) => handleFilterChange('className', e.target.value)}
                  placeholder="输入班级名称"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">儿童姓名</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.childName}
                  onChange={(e) => handleFilterChange('childName', e.target.value)}
                  placeholder="输入儿童姓名"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">接送人姓名</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.pickupPersonName}
                  onChange={(e) => handleFilterChange('pickupPersonName', e.target.value)}
                  placeholder="输入接送人姓名"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">证件尾号后四位</label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.idLast4}
                  onChange={(e) => handleFilterChange('idLast4', e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="输入4位数字"
                  maxLength={4}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono tracking-widest"
                />
              </div>
            </div>
          </div>
          {hasActiveFilters && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                清除筛选
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {statsCards.map((stat) => (
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
                  <p className="text-xs text-gray-500">{stat.label}</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={cn('p-2 rounded-lg', stat.iconBg)}>
                  <stat.icon className={cn('h-5 w-5', stat.color)} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {queueData && queueData.groups.length === 0 ? (
          <Empty title="暂无交接队列数据" description="今天还没有接送授权记录" />
        ) : (
          <div className="space-y-4">
            {queueData?.groups.map((group) => {
              const groupKey = getGroupKey(group);
              const isExpanded = expandedGroups[groupKey] ?? true;
              const pendingCount = group.authorizations.filter(
                (a) => a.status === 'APPROVED' || a.status === 'PENDING_VERIFICATION'
              ).length;
              const verifiedCount = group.authorizations.filter((a) => a.status === 'VERIFIED').length;
              const completedCount = group.authorizations.filter((a) => a.status === 'COMPLETED').length;
              const abnormalCount = group.authorizations.filter((a) => a.status === 'ABNORMAL').length;

              return (
                <div
                  key={groupKey}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                >
                  <div
                    className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => toggleGroup(groupKey)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Users className="h-5 w-5 text-blue-600" />
                        <span className="font-semibold text-gray-900">
                          {group.class_name || '未分班'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        <span>
                          {formatTime(group.time_window_start)} - {formatTime(group.time_window_end)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-3 text-xs">
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full">
                          待核验 {pendingCount}
                        </span>
                        <span className="px-2 py-1 bg-cyan-100 text-cyan-700 rounded-full">
                          已核验 {verifiedCount}
                        </span>
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">
                          已完成 {completedCount}
                        </span>
                        {abnormalCount > 0 && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                            异常 {abnormalCount}
                          </span>
                        )}
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                          共 {group.authorizations.length} 人
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-4 space-y-3">
                      {group.authorizations.map((auth) => (
                        <div
                          key={auth.id}
                          className={cn(
                            'border rounded-lg p-4 transition-all',
                            auth.status === 'COMPLETED'
                              ? 'bg-green-50 border-green-200'
                              : auth.status === 'ABNORMAL'
                              ? 'bg-purple-50 border-purple-200'
                              : auth.status === 'VERIFIED'
                              ? 'bg-cyan-50 border-cyan-200'
                              : 'bg-white border-gray-200 hover:shadow-md'
                          )}
                        >
                          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center flex-wrap gap-3 mb-3">
                                <div className="flex items-center space-x-2">
                                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                    <User className="h-5 w-5 text-blue-600" />
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-gray-900">{auth.child_name}</h4>
                                    <p className="text-sm text-gray-500">{auth.child_class || '未分班'}</p>
                                  </div>
                                </div>
                                <span
                                  className={cn(
                                    'inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium',
                                    STATUS_COLORS[auth.status]
                                  )}
                                >
                                  {getStatusIcon(auth.status)}
                                  <span>{STATUS_LABELS[auth.status]}</span>
                                </span>
                                {auth.abnormal_reason && (
                                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                                    <AlertTriangle className="h-3 w-3" />
                                    <span>{ABNORMAL_REASON_LABELS[auth.abnormal_reason]}</span>
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                                <div className="flex items-center space-x-2 text-gray-600">
                                  <Shield className="h-4 w-4 text-orange-500" />
                                  <span>
                                    接送人：<span className="font-medium text-gray-900">{auth.pickup_person_name}</span>
                                    <span className="text-gray-400 ml-1">（{auth.pickup_relation}）</span>
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2 text-gray-600">
                                  <Phone className="h-4 w-4 text-gray-400" />
                                  <span>
                                    电话：<span className="font-medium text-gray-900">{auth.pickup_person_phone}</span>
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2 text-gray-600">
                                  <CreditCard className="h-4 w-4 text-gray-400" />
                                  <span>
                                    证件尾号：<span className="font-medium text-gray-900 font-mono">{auth.pickup_person_id_last4}</span>
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2 text-gray-600">
                                  <Calendar className="h-4 w-4 text-gray-400" />
                                  <span>
                                    时间：<span className="font-medium text-gray-900">{formatTime(auth.time_window_start)} - {formatTime(auth.time_window_end)}</span>
                                  </span>
                                </div>
                              </div>

                              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
                                <span>申请人：{auth.applicant_name}</span>
                                {auth.approver_name && <span>审批人：{auth.approver_name}</span>}
                                {auth.verifier_name && auth.verified_at && (
                                  <span>核验人：{auth.verifier_name} ({formatDate(auth.verified_at)})</span>
                                )}
                                {auth.abnormal_handler_name && auth.abnormal_at && (
                                  <span className="text-purple-600">
                                    异常处理：{auth.abnormal_handler_name} ({formatDate(auth.abnormal_at)})
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 lg:flex-shrink-0">
                              <button
                                onClick={() => setAuditModal({ isOpen: true, authId: auth.id })}
                                className="flex items-center space-x-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              >
                                <Eye className="h-4 w-4" />
                                <span>轨迹</span>
                              </button>
                              {getActions(auth).map((action, idx) => (
                                <button
                                  key={idx}
                                  onClick={action.onClick}
                                  disabled={action.disabled}
                                  className={cn(
                                    'flex items-center space-x-1 px-3 py-1.5 text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                                    action.variant === 'primary' && 'bg-blue-600 hover:bg-blue-700 text-white',
                                    action.variant === 'success' && 'bg-green-600 hover:bg-green-700 text-white',
                                    action.variant === 'danger' && 'bg-red-600 hover:bg-red-700 text-white',
                                    action.variant === 'secondary' && 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                                  )}
                                >
                                  <action.icon className="h-4 w-4" />
                                  <span>{action.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {toast && (
        <div
          className={cn(
            'fixed top-4 right-4 flex items-center space-x-2 px-4 py-3 rounded-lg shadow-lg z-50',
            toast.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          )}
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

      {abnormalModal.isOpen && abnormalModal.auth && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">标记异常</h3>
                  <p className="text-sm text-gray-500">请选择异常原因</p>
                </div>
              </div>
              <button
                onClick={() => setAbnormalModal({ isOpen: false, auth: null, reason: '' })}
                disabled={submittingId === abnormalModal.auth?.id}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-6">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <div className="text-sm">
                  <p className="text-gray-600">
                    儿童：<span className="font-medium text-gray-900">{abnormalModal.auth.child_name}</span>
                  </p>
                  <p className="text-gray-600 mt-1">
                    接送人：<span className="font-medium text-gray-900">{abnormalModal.auth.pickup_person_name}</span>
                  </p>
                </div>
              </div>

              <label className="block text-sm font-medium text-gray-700 mb-3">异常原因</label>
              <div className="space-y-2">
                {abnormalReasons.map((reason) => (
                  <button
                    key={reason.value}
                    onClick={() => setAbnormalModal({ ...abnormalModal, reason: reason.value })}
                    disabled={submittingId === abnormalModal.auth?.id}
                    className={cn(
                      'w-full flex items-center space-x-3 p-3 border rounded-lg text-left transition-all disabled:opacity-50',
                      abnormalModal.reason === reason.value
                        ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    )}
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center',
                        abnormalModal.reason === reason.value ? 'bg-purple-200' : 'bg-gray-100'
                      )}
                    >
                      <reason.icon
                        className={cn(
                          'h-4 w-4',
                          abnormalModal.reason === reason.value ? 'text-purple-700' : 'text-gray-500'
                        )}
                      />
                    </div>
                    <div className="flex-1">
                      <p
                        className={cn(
                          'font-medium',
                          abnormalModal.reason === reason.value ? 'text-purple-900' : 'text-gray-900'
                        )}
                      >
                        {reason.label}
                      </p>
                    </div>
                    {abnormalModal.reason === reason.value && (
                      <Check className="h-5 w-5 text-purple-600" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setAbnormalModal({ isOpen: false, auth: null, reason: '' })}
                disabled={submittingId === abnormalModal.auth?.id}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={confirmMarkAbnormal}
                disabled={submittingId === abnormalModal.auth?.id || !abnormalModal.reason}
                className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                {submittingId === abnormalModal.auth?.id && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                <span>确认标记</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {auditModal.isOpen && auditModal.authId !== null && (
        <AuditLogModal
          authId={auditModal.authId}
          isOpen={auditModal.isOpen}
          onClose={() => setAuditModal({ isOpen: false, authId: null })}
        />
      )}
    </Layout>
  );
}
