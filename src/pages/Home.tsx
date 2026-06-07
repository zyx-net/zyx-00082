import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';

export default function Home() {
  const { user } = useAuthStore();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const redirectPath =
    user.role === 'guardian'
      ? '/guardian'
      : user.role === 'teacher'
      ? '/teacher'
      : '/admin';

  return <Navigate to={redirectPath} replace />;
}