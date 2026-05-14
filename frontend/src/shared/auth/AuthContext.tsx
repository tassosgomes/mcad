import { createContext } from 'react';
import type { User } from 'oidc-client-ts';

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoggingOut: boolean;
  roles: string[];
  /**
   * @deprecated Não use para autorização de negócio. Use `usePermissions().can(...)`
   * do `@shared/authz`. Mantido apenas para callers em domínios ainda sem catálogo
   * de permissões formalizado (ex.: distribuição, marcada com TODO Fase F).
   */
  hasRole: (role: string) => boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => string | null;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);