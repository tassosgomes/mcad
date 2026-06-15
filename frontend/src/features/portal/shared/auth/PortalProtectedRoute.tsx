import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Loading } from '@components/ui/loading';
import { usePortalAuth } from './usePortalAuth';

interface PortalProtectedRouteProps {
  children: ReactNode;
}

export function PortalProtectedRoute({ children }: PortalProtectedRouteProps) {
  const { isAuthenticated, isLoading } = usePortalAuth();

  if (isLoading) {
    return <Loading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/portal/login" replace />;
  }

  return <>{children}</>;
}
