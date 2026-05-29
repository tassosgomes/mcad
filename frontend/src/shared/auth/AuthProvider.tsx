import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import type { User } from 'oidc-client-ts';
import { Loading } from '@components/ui/loading';
import { setArrecadacaoAuthTokenProvider } from '@services/apiArrecadacaoClient';
import { setAuditoriaAuthTokenProvider } from '@services/apiAuditoriaClient';
import { setAuthzAuthTokenProvider } from '@services/apiAuthzClient';
import { setBffAuthTokenProvider } from '@services/apiBffClient';
import { setAuthTokenProvider } from '@services/apiClient';
import { setDistribuicaoAuthTokenProvider } from '@services/apiDistribuicaoClient';
import { setIdentificacaoAuthTokenProvider } from '@services/apiIdentificacaoClient';
import { setAuthenticatedFetchUnauthorizedHandler } from '@services/authenticatedFetch';
import { AuthContext } from './AuthContext';
import { userManager } from './authConfig';
import { clearOidcClientState } from './oidcStorageCleanup';

const LOGOUT_IN_PROGRESS_KEY = 'auth.logout_in_progress';

interface AuthProviderProps {
  children: ReactNode;
}

function extractRoles(user: User | null): string[] {
  const roles = user?.profile?.roles;

  if (Array.isArray(roles)) {
    return roles.filter((role): role is string => typeof role === 'string');
  }

  return [];
}

function getCurrentReturnUrl(): string {
  const returnUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  return returnUrl || '/';
}

async function startLoginRedirect() {
  clearOidcClientState();
  sessionStorage.removeItem(LOGOUT_IN_PROGRESS_KEY);
  sessionStorage.setItem('returnUrl', getCurrentReturnUrl());
  await userManager.signinRedirect();
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

    const handleAccessTokenExpired = () => {
      setUser(null);
    };

    const handleSilentRenewError = () => {
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
    userManager.events.addAccessTokenExpired(handleAccessTokenExpired);
    userManager.events.addSilentRenewError(handleSilentRenewError);

    void loadUser();

    return () => {
      isMounted = false;
      userManager.events.removeUserLoaded(handleUserLoaded);
      userManager.events.removeUserUnloaded(handleUserUnloaded);
      userManager.events.removeAccessTokenExpired(handleAccessTokenExpired);
      userManager.events.removeSilentRenewError(handleSilentRenewError);
    };
  }, []);

  const roles = extractRoles(user);
  const isAuthenticated = user !== null && !user.expired;

  const login = async () => {
    await startLoginRedirect();
    setIsLoggingOut(false);
  };

  const logout = async () => {
    sessionStorage.setItem(LOGOUT_IN_PROGRESS_KEY, 'true');
    setIsLoggingOut(true);
    sessionStorage.removeItem('returnUrl');
    await userManager.signoutRedirect();
  };

  const getToken = () => user?.access_token ?? null;

  useEffect(() => {
    setArrecadacaoAuthTokenProvider(() => user?.access_token ?? null);
    setAuditoriaAuthTokenProvider(() => user?.access_token ?? null);
    setAuthzAuthTokenProvider(() => user?.access_token ?? null);
    setBffAuthTokenProvider(() => user?.access_token ?? null);
    setAuthTokenProvider(() => user?.access_token ?? null);
    setDistribuicaoAuthTokenProvider(() => user?.access_token ?? null);
    setIdentificacaoAuthTokenProvider(() => user?.access_token ?? null);

    return () => {
      setArrecadacaoAuthTokenProvider(null);
      setAuditoriaAuthTokenProvider(null);
      setAuthzAuthTokenProvider(null);
      setBffAuthTokenProvider(null);
      setAuthTokenProvider(null);
      setDistribuicaoAuthTokenProvider(null);
      setIdentificacaoAuthTokenProvider(null);
    };
  }, [user]);

  useEffect(() => {
    setAuthenticatedFetchUnauthorizedHandler(async () => {
      try {
        const renewedUser = await userManager.signinSilent();
        const activeUser = renewedUser && !renewedUser.expired ? renewedUser : null;
        setUser(activeUser);

        return activeUser?.access_token ?? null;
      } catch {
        setUser(null);

        if (sessionStorage.getItem(LOGOUT_IN_PROGRESS_KEY) !== 'true') {
          await startLoginRedirect();
        }

        return null;
      }
    });

    return () => {
      setAuthenticatedFetchUnauthorizedHandler(null);
    };
  }, []);

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
        login,
        logout,
        getToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
