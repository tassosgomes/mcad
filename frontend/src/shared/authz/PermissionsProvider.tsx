import { createContext, useCallback, useEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@shared/auth/useAuth';
import { fetchPermissions } from './permissionsApi';
import {
  PermissionsUnauthorizedError,
  type Permission,
  type PermissionsState,
} from './types';

export const PERMISSIONS_QUERY_KEY = ['authz', 'permissions'] as const;

export const PermissionsContext = createContext<PermissionsState | undefined>(undefined);

interface PermissionsProviderProps {
  children: ReactNode;
  /** Override for tests. Defaults to global `fetch`. */
  fetchImpl?: typeof fetch;
}

const EMPTY_PERMISSIONS: Set<Permission> = new Set();

export function PermissionsProvider({ children, fetchImpl }: PermissionsProviderProps) {
  const { isAuthenticated, getToken, logout } = useAuth();
  const queryClient = useQueryClient();
  const logoutTriggeredRef = useRef(false);

  const query = useQuery({
    queryKey: PERMISSIONS_QUERY_KEY,
    enabled: isAuthenticated,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: (failureCount, error) => {
      if (error instanceof PermissionsUnauthorizedError) {
        return false;
      }
      return failureCount < 1;
    },
    queryFn: async ({ signal }) => {
      const token = getToken();
      if (!token) {
        throw new PermissionsUnauthorizedError(401, 'UNAUTHORIZED', 'Missing access token');
      }
      return fetchPermissions({ token, signal, fetchImpl });
    },
  });

  // Force logout on 401 from the BFF and clear cached permissions.
  useEffect(() => {
    if (!(query.error instanceof PermissionsUnauthorizedError)) {
      return;
    }
    if (logoutTriggeredRef.current) {
      return;
    }
    logoutTriggeredRef.current = true;
    queryClient.setQueryData(PERMISSIONS_QUERY_KEY, undefined);
    void logout();
  }, [query.error, logout, queryClient]);

  // Reset the logout latch when the user transitions back to authenticated.
  useEffect(() => {
    if (isAuthenticated) {
      logoutTriggeredRef.current = false;
    }
  }, [isAuthenticated]);

  const permissionsSet = useMemo(() => {
    if (!query.data) {
      return EMPTY_PERMISSIONS;
    }
    return new Set(query.data.data.permissions);
  }, [query.data]);

  const version = query.data?.data.version ?? null;

  const can = useCallback(
    (permission: Permission) => permissionsSet.has(permission),
    [permissionsSet],
  );

  const hasAny = useCallback(
    (permissions: Permission[]) => permissions.some((permission) => permissionsSet.has(permission)),
    [permissionsSet],
  );

  const hasAll = useCallback(
    (permissions: Permission[]) => permissions.every((permission) => permissionsSet.has(permission)),
    [permissionsSet],
  );

  const reload = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: PERMISSIONS_QUERY_KEY });
  }, [queryClient]);

  const value = useMemo<PermissionsState>(
    () => ({
      permissions: permissionsSet,
      version,
      isLoading: isAuthenticated && (query.isPending || query.isFetching),
      error: query.error ?? null,
      can,
      hasAny,
      hasAll,
      reload,
    }),
    [
      permissionsSet,
      version,
      isAuthenticated,
      query.isPending,
      query.isFetching,
      query.error,
      can,
      hasAny,
      hasAll,
      reload,
    ],
  );

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

/**
 * Invalidate the cached permissions, forcing a refetch on next read. Useful
 * for hooking into version-change signals (`X-Authz-Version`) elsewhere.
 */
export function invalidatePermissionsQuery(
  queryClient: ReturnType<typeof useQueryClient>,
): void {
  void queryClient.invalidateQueries({ queryKey: PERMISSIONS_QUERY_KEY });
}
