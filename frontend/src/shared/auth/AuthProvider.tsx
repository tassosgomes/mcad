import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import type { User } from 'oidc-client-ts';
import { Loading } from '@components/ui/loading';
import { setArrecadacaoAuthTokenProvider } from '@services/apiArrecadacaoClient';
import { setAuthTokenProvider } from '@services/apiClient';
import { setIdentificacaoAuthTokenProvider } from '@services/apiIdentificacaoClient';
import { AuthContext } from './AuthContext';
import { userManager } from './authConfig';

const LOGOUT_IN_PROGRESS_KEY = 'auth.logout_in_progress';

interface AuthProviderProps {
  children: ReactNode;
}

interface RealmAccessProfile {
  realm_access?: {
    roles?: unknown;
  };
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const [, payload] = token.split('.');

  if (!payload) {
    return null;
  }

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = atob(padded);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function extractRoles(user: User | null): string[] {
  const roles = (user?.profile as RealmAccessProfile | undefined)?.realm_access?.roles;

  if (Array.isArray(roles)) {
    return roles.filter((role): role is string => typeof role === 'string');
  }

  const accessTokenPayload = user?.access_token ? decodeJwtPayload(user.access_token) : null;
  const tokenRoles = (accessTokenPayload?.realm_access as RealmAccessProfile['realm_access'] | undefined)?.roles;

  if (!Array.isArray(tokenRoles)) {
    return [];
  }

  return tokenRoles.filter((role): role is string => typeof role === 'string');
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(
    () => sessionStorage.getItem(LOGOUT_IN_PROGRESS_KEY) === 'true'
  );

  useEffect(() => {
    let isMounted = true;

    const handleUserLoaded = (loadedUser: User) => {
      setUser(loadedUser.expired ? null : loadedUser);
    };

    const handleUserUnloaded = () => {
      setUser(null);
    };

    const loadUser = async () => {
      try {
        await userManager.clearStaleState();
        const currentUser = await userManager.getUser();

        if (!isMounted) {
          return;
        }

        setUser(currentUser && !currentUser.expired ? currentUser : null);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    userManager.events.addUserLoaded(handleUserLoaded);
    userManager.events.addUserUnloaded(handleUserUnloaded);

    void loadUser();

    return () => {
      isMounted = false;
      userManager.events.removeUserLoaded(handleUserLoaded);
      userManager.events.removeUserUnloaded(handleUserUnloaded);
    };
  }, []);

  const roles = extractRoles(user);
  const isAuthenticated = user !== null && !user.expired;

  const login = async () => {
    sessionStorage.removeItem(LOGOUT_IN_PROGRESS_KEY);
    setIsLoggingOut(false);
    const returnUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    sessionStorage.setItem('returnUrl', returnUrl || '/');
    await userManager.signinRedirect();
  };

  const logout = async () => {
    sessionStorage.setItem(LOGOUT_IN_PROGRESS_KEY, 'true');
    setIsLoggingOut(true);
    sessionStorage.removeItem('returnUrl');
    await userManager.signoutRedirect();
  };

  const getToken = () => user?.access_token ?? null;
  const hasRole = (role: string) => roles.includes(role);

  useEffect(() => {
    setArrecadacaoAuthTokenProvider(() => user?.access_token ?? null);
    setAuthTokenProvider(() => user?.access_token ?? null);
    setIdentificacaoAuthTokenProvider(() => user?.access_token ?? null);

    return () => {
      setArrecadacaoAuthTokenProvider(null);
      setAuthTokenProvider(null);
      setIdentificacaoAuthTokenProvider(null);
    };
  }, [user]);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoggingOut,
        roles,
        hasRole,
        login,
        logout,
        getToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}