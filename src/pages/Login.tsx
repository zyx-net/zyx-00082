import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Shield, Lock, User, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { user, login, isLoading, error, clearError, checkAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(true);

  const from = (location.state as { from?: Location })?.from?.pathname || '/';

  useEffect(() => {
    const verify = async () => {
      if (user) {
        setChecking(false);
        return;
      }
      const result = await checkAuth();
      if (result) {
        setChecking(false);
      } else {
        setChecking(false);
      }
    };
    verify();
  }, [user, checkAuth]);

  useEffect(() => {
    if (user) {
      const redirectPath = user.role === 'guardian' ? '/guardian' : user.role === 'teacher' ? '/teacher' : '/admin';
      navigate(from !== '/' ? from : redirectPath, { replace: true });
    }
  }, [user, navigate, from]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/guardian" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!username || !password) {
      return;
    }

    const success = await login(username, password);
    if (success) {
      // 导航会在 useEffect 中处理
    }
  };

  const demoAccounts = [
    { role: '系统管理员', username: 'admin', password: 'admin123' },
    { role: '老师', username: 'teacher1', password: 'teacher123' },
    { role: '监护人1（张伟）', username: 'guardian1', password: 'guardian123' },
    { role: '监护人2（李娜）', username: 'guardian2', password: 'guardian123' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">社区托育接送授权系统</h2>
          <p className="mt-2 text-sm text-gray-600">请登录以继续操作</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                用户名
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="请输入用户名"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                密码
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="请输入密码"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>登录中...</span>
                </div>
              ) : (
                '登录'
              )}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">演示账号</span>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {demoAccounts.map((account, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setUsername(account.username);
                    setPassword(account.password);
                  }}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-blue-300 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">{account.role}</span>
                    <span className="text-xs text-gray-500">点击填充</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    账号：{account.username} / 密码：{account.password}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
