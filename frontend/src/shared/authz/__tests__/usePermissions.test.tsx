import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '@shared/auth/AuthContext';
import { PermissionsProvider } from '../PermissionsProvider';
import { usePermissions } from '../usePermissions';

function authValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: null,
    isAuthenticated: true,
    isLoggingOut: false,
    roles: [],
    hasRole: () => false,
    login: async () => undefined,
    logout: vi.fn(async () => undefined),
    getToken: () => 'jwt-test',
    ...overrides,
  };
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

function buildWrapper(auth: AuthContextValue, queryClient = makeQueryClient()) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AuthContext.Provider value={auth}>
        <QueryClientProvider client={queryClient}>
          <PermissionsProvider>{children}</PermissionsProvider>
        </QueryClientProvider>
      </AuthContext.Provider>
    );
  };
}

describe('usePermissions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws when used outside of PermissionsProvider', () => {
    const renderOutside = () => renderHook(() => usePermissions());
    expect(renderOutside).toThrow(/PermissionsProvider/);
  });

  it('returns the permissions set when the BFF responds 200', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({
        subjectId: 'user-1',
        permissions: ['cadastro:default:obra:listar', 'cadastro:default:obra:criar'],
        version: 3,
      }),
    );

    const { result } = renderHook(() => usePermissions(), {
      wrapper: buildWrapper(authValue()),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.permissions.size).toBe(2);
    expect(result.current.version).toBe(3);
    expect(result.current.can('cadastro:default:obra:listar')).toBe(true);
    expect(result.current.can('cadastro:default:obra:editar')).toBe(false);
  });

  it('evaluates hasAny and hasAll over the permission set', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({
        subjectId: 'user-1',
        permissions: ['cadastro:default:obra:listar', 'cadastro:default:obra:criar'],
        version: 1,
      }),
    );

    const { result } = renderHook(() => usePermissions(), {
      wrapper: buildWrapper(authValue()),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(
      result.current.hasAny(['cadastro:default:obra:criar', 'cadastro:default:obra:excluir']),
    ).toBe(true);
    expect(
      result.current.hasAny(['cadastro:default:obra:editar', 'cadastro:default:obra:excluir']),
    ).toBe(false);
    expect(
      result.current.hasAll(['cadastro:default:obra:criar', 'cadastro:default:obra:listar']),
    ).toBe(true);
    expect(
      result.current.hasAll(['cadastro:default:obra:criar', 'cadastro:default:obra:editar']),
    ).toBe(false);
  });

  it('skips fetching when the user is not authenticated', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    const { result } = renderHook(() => usePermissions(), {
      wrapper: buildWrapper(authValue({ isAuthenticated: false })),
    });

    // Give the effect loop one tick.
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.permissions.size).toBe(0);
    expect(result.current.version).toBeNull();
  });

  it('logs out and clears state when the BFF returns 401', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ code: 'INVALID_TOKEN' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const logout = vi.fn(async () => undefined);
    const { result } = renderHook(() => usePermissions(), {
      wrapper: buildWrapper(authValue({ logout })),
    });

    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));

    expect(result.current.permissions.size).toBe(0);
    expect(result.current.version).toBeNull();
  });

  it('reload() invalidates the cache and triggers a refetch', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        jsonResponse({ subjectId: 'user-1', permissions: ['a'], version: 1 }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ subjectId: 'user-1', permissions: ['a', 'b'], version: 2 }),
      );

    const { result } = renderHook(() => usePermissions(), {
      wrapper: buildWrapper(authValue()),
    });

    await waitFor(() => expect(result.current.version).toBe(1));
    expect(result.current.can('b')).toBe(false);

    result.current.reload();

    await waitFor(() => expect(result.current.version).toBe(2));
    expect(result.current.can('b')).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
