import type { ReactNode } from 'react';
import { useAuth } from './useAuth';
import { ErrorState } from '@components/ui/error-state';

interface RequireRoleProps {
  roles: string[];
  children: ReactNode;
}

export function RequireRole({ roles, children }: RequireRoleProps) {
  const { hasRole } = useAuth();
  
  const isAuthorized = roles.length === 0 || roles.some(role => hasRole(role));

  if (!isAuthorized) {
    return <ErrorState message="Acesso negado. Você não tem permissão para acessar esta área." />;
  }

  return <>{children}</>;
}
