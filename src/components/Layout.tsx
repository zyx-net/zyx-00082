import { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { LogOut, User, Shield, Home, FileText, Settings, Users } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) return null;

  const getNavItems = () => {
    switch (user.role) {
      case 'guardian':
        return [
          { path: '/guardian', label: '首页', icon: Home },
          { path: '/guardian/apply', label: '申请授权', icon: FileText },
          { path: '/guardian/approve', label: '待我审批', icon: Shield },
          { path: '/guardian/history', label: '历史记录', icon: FileText },
        ];
      case 'teacher':
        return [
          { path: '/teacher', label: '首页', icon: Home },
          { path: '/teacher/handoff-queue', label: '放学交接队列', icon: Users },
          { path: '/teacher/verify', label: '待核验', icon: Shield },
          { path: '/teacher/history', label: '今日记录', icon: FileText },
        ];
      case 'admin':
        return [
          { path: '/admin', label: '仪表盘', icon: Home },
          { path: '/admin/handoff-queue', label: '放学交接队列', icon: Users },
          { path: '/admin/verify', label: '待核验', icon: Shield },
          { path: '/admin/history', label: '全部记录', icon: FileText },
          { path: '/admin/audit', label: '审计日志', icon: Users },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  const roleLabel = {
    guardian: '监护人',
    teacher: '老师',
    admin: '系统管理员',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 text-white p-2 rounded-lg">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">社区托育接送授权系统</h1>
                <p className="text-xs text-gray-500">儿童临时接送安全管理平台</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{roleLabel[user.role]}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>退出</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          <nav className="w-48 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors border-b border-gray-100 last:border-b-0"
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </nav>

          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
