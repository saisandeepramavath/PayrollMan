import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PageLoader } from '../ui';

export function ProtectedRoute({ adminOnly = false }: { adminOnly?: boolean }) {
  const { user, isLoading, canManageUsers } = useAuth();

  if (isLoading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !canManageUsers) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <PageLoader />;
  if (user) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
