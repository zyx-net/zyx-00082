import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { childrenApi, authorizationsApi } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import type { Child, CreateAuthorizationRequest } from '@/types';
import {
  FileText,
  User,
  Phone,
  Shield,
  Calendar,
  Clock,
  Users,
  AlertCircle,
  CheckCircle,
  Loader2,
  ChevronDown,
} from 'lucide-react';

export default function GuardianApply() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [children, setChildren] = useState<Child[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(true);

  const [childId, setChildId] = useState('');
  const [pickupPersonName, setPickupPersonName] = useState('');
  const [pickupPersonPhone, setPickupPersonPhone] = useState('');
  const [pickupPersonIdLast4, setPickupPersonIdLast4] = useState('');
  const [pickupRelation, setPickupRelation] = useState('');
  const [timeWindowStart, setTimeWindowStart] = useState('');
  const [timeWindowEnd, setTimeWindowEnd] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const response = await childrenApi.getChildren();
        if (response.success && response.data && user) {
          const myChildren = response.data.filter(
            (child) => child.guardian1_id === user.id || child.guardian2_id === user.id
          );
          setChildren(myChildren);
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoadingChildren(false);
      }
    };
    fetchChildren();
  }, [user]);

  const getCurrentDateTimeLocal = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!childId) {
      errors.childId = '请选择儿童';
    }
    if (!pickupPersonName.trim()) {
      errors.pickupPersonName = '请输入接送人姓名';
    }
    if (!pickupPersonPhone.trim()) {
      errors.pickupPersonPhone = '请输入接送人电话';
    }
    if (!pickupPersonIdLast4.trim()) {
      errors.pickupPersonIdLast4 = '请输入证件尾号';
    } else if (!/^\d{4}$/.test(pickupPersonIdLast4)) {
      errors.pickupPersonIdLast4 = '证件尾号必须是4位数字';
    }
    if (!pickupRelation.trim()) {
      errors.pickupRelation = '请输入与儿童关系';
    }
    if (!timeWindowStart) {
      errors.timeWindowStart = '请选择接送开始时间';
    }
    if (!timeWindowEnd) {
      errors.timeWindowEnd = '请选择接送结束时间';
    }

    if (timeWindowStart && timeWindowEnd) {
      const start = new Date(timeWindowStart);
      const end = new Date(timeWindowEnd);
      const now = new Date();

      if (end <= now) {
        errors.timeWindowEnd = '结束时间不能早于当前时间';
      } else if (start >= end) {
        errors.timeWindowEnd = '结束时间必须晚于开始时间';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const data: CreateAuthorizationRequest = {
        childId: parseInt(childId),
        pickupPersonName: pickupPersonName.trim(),
        pickupPersonPhone: pickupPersonPhone.trim(),
        pickupPersonIdLast4: pickupPersonIdLast4.trim(),
        pickupRelation: pickupRelation.trim(),
        timeWindowStart: new Date(timeWindowStart).toISOString(),
        timeWindowEnd: new Date(timeWindowEnd).toISOString(),
      };

      const response = await authorizationsApi.createAuthorization(data);
      if (response.success) {
        setSuccess('申请提交成功！正在跳转...');
        setTimeout(() => {
          navigate('/guardian/history');
        }, 1500);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingChildren) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="animate-spin h-10 w-10 text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">加载中...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center space-x-3 mb-2">
            <div className="bg-blue-600 text-white p-2 rounded-lg">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">申请授权</h1>
              <p className="text-sm text-gray-500">填写接送人信息，创建临时接送授权</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {error && (
            <div className="flex items-center space-x-2 p-4 mb-6 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center space-x-2 p-4 mb-6 bg-green-50 border border-green-200 rounded-lg text-green-700">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="childId" className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span>选择儿童 <span className="text-red-500">*</span></span>
                </div>
              </label>
              <div className="relative">
                <select
                  id="childId"
                  value={childId}
                  onChange={(e) => setChildId(e.target.value)}
                  className={`block w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors appearance-none pr-10 ${
                    fieldErrors.childId ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                >
                  <option value="">请选择儿童</option>
                  {children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.name} - {child.class_name || '未分班'}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>
              {fieldErrors.childId && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.childId}</p>
              )}
            </div>

            <div>
              <label htmlFor="pickupPersonName" className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span>接送人姓名 <span className="text-red-500">*</span></span>
                </div>
              </label>
              <input
                id="pickupPersonName"
                type="text"
                value={pickupPersonName}
                onChange={(e) => setPickupPersonName(e.target.value)}
                placeholder="请输入接送人姓名"
                className={`block w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  fieldErrors.pickupPersonName ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {fieldErrors.pickupPersonName && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.pickupPersonName}</p>
              )}
            </div>

            <div>
              <label htmlFor="pickupPersonPhone" className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>接送人电话 <span className="text-red-500">*</span></span>
                </div>
              </label>
              <input
                id="pickupPersonPhone"
                type="tel"
                value={pickupPersonPhone}
                onChange={(e) => setPickupPersonPhone(e.target.value)}
                placeholder="请输入接送人联系电话"
                className={`block w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  fieldErrors.pickupPersonPhone ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {fieldErrors.pickupPersonPhone && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.pickupPersonPhone}</p>
              )}
            </div>

            <div>
              <label htmlFor="pickupPersonIdLast4" className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-gray-400" />
                  <span>接送人证件尾号 <span className="text-red-500">*</span></span>
                </div>
              </label>
              <input
                id="pickupPersonIdLast4"
                type="text"
                maxLength={4}
                value={pickupPersonIdLast4}
                onChange={(e) => setPickupPersonIdLast4(e.target.value.replace(/\D/g, ''))}
                placeholder="请输入4位证件尾号"
                className={`block w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  fieldErrors.pickupPersonIdLast4 ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {fieldErrors.pickupPersonIdLast4 && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.pickupPersonIdLast4}</p>
              )}
            </div>

            <div>
              <label htmlFor="pickupRelation" className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span>与儿童关系 <span className="text-red-500">*</span></span>
                </div>
              </label>
              <input
                id="pickupRelation"
                type="text"
                value={pickupRelation}
                onChange={(e) => setPickupRelation(e.target.value)}
                placeholder="如：爷爷、奶奶、外公、外婆、其他亲属等"
                className={`block w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  fieldErrors.pickupRelation ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {fieldErrors.pickupRelation && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.pickupRelation}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="timeWindowStart" className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>接送开始时间 <span className="text-red-500">*</span></span>
                  </div>
                </label>
                <input
                  id="timeWindowStart"
                  type="datetime-local"
                  min={getCurrentDateTimeLocal()}
                  value={timeWindowStart}
                  onChange={(e) => setTimeWindowStart(e.target.value)}
                  className={`block w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    fieldErrors.timeWindowStart ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {fieldErrors.timeWindowStart && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.timeWindowStart}</p>
                )}
              </div>

              <div>
                <label htmlFor="timeWindowEnd" className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span>接送结束时间 <span className="text-red-500">*</span></span>
                  </div>
                </label>
                <input
                  id="timeWindowEnd"
                  type="datetime-local"
                  min={getCurrentDateTimeLocal()}
                  value={timeWindowEnd}
                  onChange={(e) => setTimeWindowEnd(e.target.value)}
                  className={`block w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    fieldErrors.timeWindowEnd ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {fieldErrors.timeWindowEnd && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.timeWindowEnd}</p>
                )}
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="animate-spin h-5 w-5" />
                    <span>提交中...</span>
                  </div>
                ) : (
                  '提交申请'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
