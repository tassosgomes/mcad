import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Loading } from '@components/ui/loading';
import { useAuth } from './useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoggingOut, login } = useAuth();

  useEffect(() => {
    if (!isAuthenticated && !isLoggingOut) {
      void login();
    }
  }, [isAuthenticated, isLoggingOut, login]);

  if (!isAuthenticated) {
    return <Loading />;
  }

  return <>{children}</>;
}