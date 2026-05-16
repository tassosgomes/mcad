import { createContext } from 'react';
import type { User } from 'oidc-client-ts';

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoggingOut: boolean;
  roles: string[];
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => string | null;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);