import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setBffAuthTokenProvider } from '@services/apiBffClient';
import { AUTHZ_PERMISSION_LIFECYCLE_CAPABILITIES } from '../contract/authzPermissionLifecycleContract';
import {
  linkedRolesQueryKey,
  useCreatePermission,
  useDeprecatePermissionGoverned,
  usePermissionLifecycleCapabilities,
  usePermissionLinkedRoles,
  usePermissionOperationAvailable,
  useReactivatePermission,
  useRemovePermission,
} from './usePermissionLifecycle';

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

function buildWrapper(queryClient = makeQueryClient()) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function mockJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const BASE_PERMISSION = {
  id: 'perm-1',
  key: 'cadastro:obras:obra:visualizar',
  displayName: 'Visualizar obra',
  description: null,
  domain: 'cadastro',
  area: 'obras',
  resource: 'obra',
  action: 'visualizar',
  serviceName: 'cadastro-api',
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('usePermissionLifecycleCapabilities', () => {
  it('returns the static capability matrix from the contract', () => {
    const { result } = renderHook(() => usePermissionLifecycleCapabilities(), {
      wrapper: buildWrapper(),
    });

    expect(result.current).toEqual(AUTHZ_PERMISSION_LIFECYCLE_CAPABILITIES);
    expect(result.current.canDeprecate).toBe(true);
    expect(result.current.canListLinkedRoles).toBe(true);
    expect(result.current.canCreate).toBe(false);
    expect(result.current.canReactivate).toBe(false);
    expect(result.current.canRemove).toBe(false);
  });
});

describe('usePermissionOperationAvailable', () => {
  it('returns true for Phase 1 operations and false for Phase 2 operations', () => {
    const { result: deprecate } = renderHook(
      () => usePermissionOperationAvailable('deprecate'),
      { wrapper: buildWrapper() },
    );
    const { result: listLinkedRoles } = renderHook(
      () => usePermissionOperationAvailable('listLinkedRoles'),
      { wrapper: buildWrapper() },
    );
    const { result: create } = renderHook(
      () => usePermissionOperationAvailable('create'),
      { wrapper: buildWrapper() },
    );
    const { result: reactivate } = renderHook(
      () => usePermissionOperationAvailable('reactivate'),
      { wrapper: buildWrapper() },
    );
    const { result: remove } = renderHook(
      () => usePermissionOperationAvailable('remove'),
      { wrapper: buildWrapper() },
    );

    expect(deprecate.current).toBe(true);
    expect(listLinkedRoles.current).toBe(true);
    expect(create.current).toBe(false);
    expect(reactivate.current).toBe(false);
    expect(remove.current).toBe(false);
  });
});

describe('usePermissionLinkedRoles', () => {
  afterEach(() => {
    setBffAuthTokenProvider(null);
    vi.restoreAllMocks();
  });

  it('does not fetch when permissionId is null', () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    const { result } = renderHook(() => usePermissionLinkedRoles(null), {
      wrapper: buildWrapper(),
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('fetches linked roles when a permissionId is provided', async () => {
    const eligibility = {
      permissionId: 'perm-1',
      permissionStatus: 'DEPRECATED',
      linkedRoles: [
        { id: 'role-1', key: 'cadastro.obras.analista', displayName: 'Analista', status: 'ACTIVE' },
      ],
      canRemove: false,
      blockingReason: 'ROLE_LINKS_PRESENT',
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockJsonResponse(eligibility));
    setBffAuthTokenProvider(() => 'token-test');

    const { result } = renderHook(() => usePermissionLinkedRoles('perm-1'), {
      wrapper: buildWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.permissionId).toBe('perm-1');
    expect(result.current.data?.canRemove).toBe(false);
    expect(result.current.data?.blockingReason).toBe('ROLE_LINKS_PRESENT');
    expect(result.current.data?.linkedRoles).toHaveLength(1);
  });

  it('marks the query as eligible for removal when no roles are linked and permission is deprecated', async () => {
    const eligibility = {
      permissionId: 'perm-2',
      permissionStatus: 'DEPRECATED',
      linkedRoles: [],
      canRemove: true,
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockJsonResponse(eligibility));
    setBffAuthTokenProvider(() => 'token-test');

    const { result } = renderHook(() => usePermissionLinkedRoles('perm-2'), {
      wrapper: buildWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.canRemove).toBe(true);
    expect(result.current.data?.blockingReason).toBeUndefined();
  });

  it('exposes the stable linked-roles query key', () => {
    expect(linkedRolesQueryKey).toEqual(['authz', 'permission-linked-roles']);
  });
});

describe('useDeprecatePermissionGoverned', () => {
  afterEach(() => {
    setBffAuthTokenProvider(null);
    vi.restoreAllMocks();
  });

  it('calls the governed BFF deprecation endpoint and returns the updated permission', async () => {
    const deprecatedPermission = { ...BASE_PERMISSION, status: 'DEPRECATED' };
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(mockJsonResponse(deprecatedPermission));
    setBffAuthTokenProvider(() => 'token-test');

    const { result } = renderHook(() => useDeprecatePermissionGoverned(), {
      wrapper: buildWrapper(),
    });

    result.current.mutate('perm-1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/autorizacao/permissoes/perm-1/depreciar',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result.current.data?.status).toBe('DEPRECATED');
  });
});

describe('Phase 2 stubs: error surfacing', () => {
  afterEach(() => {
    setBffAuthTokenProvider(null);
    vi.restoreAllMocks();
  });

  it('useCreatePermission surfaces 501 AUTHZ_PERMISSION_OPERATION_UNAVAILABLE from BFF', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ code: 'AUTHZ_PERMISSION_OPERATION_UNAVAILABLE', operation: 'create' }),
        { status: 501, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    setBffAuthTokenProvider(() => 'token-test');

    const { result } = renderHook(() => useCreatePermission(), { wrapper: buildWrapper() });

    result.current.mutate({
      key: 'cadastro:obras:obra:aprovar',
      displayName: 'Aprovar obra',
      domain: 'cadastro',
      area: 'obras',
      resource: 'obra',
      action: 'aprovar',
    });
    await waitFor(() => expect(result.current.isError).toBe(true));

    const error = result.current.error as unknown as Record<string, unknown>;
    expect(error.code).toBe('AUTHZ_PERMISSION_OPERATION_UNAVAILABLE');
    expect(error.status).toBe(501);
  });

  it('useReactivatePermission surfaces 501 AUTHZ_PERMISSION_OPERATION_UNAVAILABLE from BFF', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ code: 'AUTHZ_PERMISSION_OPERATION_UNAVAILABLE', operation: 'reactivate' }),
        { status: 501, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    setBffAuthTokenProvider(() => 'token-test');

    const { result } = renderHook(() => useReactivatePermission(), { wrapper: buildWrapper() });

    result.current.mutate('perm-1');
    await waitFor(() => expect(result.current.isError).toBe(true));

    const error = result.current.error as unknown as Record<string, unknown>;
    expect(error.code).toBe('AUTHZ_PERMISSION_OPERATION_UNAVAILABLE');
  });

  it('useRemovePermission surfaces 501 AUTHZ_PERMISSION_OPERATION_UNAVAILABLE from BFF', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ code: 'AUTHZ_PERMISSION_OPERATION_UNAVAILABLE', operation: 'remove' }),
        { status: 501, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    setBffAuthTokenProvider(() => 'token-test');

    const { result } = renderHook(() => useRemovePermission(), { wrapper: buildWrapper() });

    result.current.mutate({ permissionId: 'perm-1', confirmationText: 'CONFIRMO' });
    await waitFor(() => expect(result.current.isError).toBe(true));

    const error = result.current.error as unknown as Record<string, unknown>;
    expect(error.code).toBe('AUTHZ_PERMISSION_OPERATION_UNAVAILABLE');
  });
});
