import { afterEach, describe, expect, it, vi } from 'vitest';
import { setAuthzAuthTokenProvider } from '@services/apiAuthzClient';
import {
  addPermissionToRole,
  createRole,
  deactivateRole,
  getRole,
  listRolePermissions,
  listRoles,
  removePermissionFromRole,
  updateRole,
} from './authzRolesApi';

function mockJsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('authzRolesApi', () => {
  afterEach(() => {
    setAuthzAuthTokenProvider(null);
    vi.restoreAllMocks();
  });

  it('lists roles with filters through the AuthZ BFF path', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockJsonResponse({
      content: [],
      page: 0,
      size: 20,
      totalElements: 0,
      totalPages: 0,
    }));
    setAuthzAuthTokenProvider(() => 'token-123');

    await listRoles({
      page: 0,
      size: 20,
      domain: 'cadastro',
      area: 'gestao',
      status: 'ACTIVE',
      q: 'analista',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/authz/v1/roles?page=0&size=20&sort=key%2Casc&domain=cadastro&area=gestao&status=ACTIVE&q=analista',
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    );
    const requestInit = fetchMock.mock.calls[0][1] as RequestInit;
    expect((requestInit.headers as Headers).get('Authorization')).toBe('Bearer token-123');
  });

  it('creates a role and links permissions with POST payloads', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(mockJsonResponse({
        id: 'role-1',
        key: 'cadastro.gestao.analista',
        displayName: 'Analista de Cadastro',
        domain: 'cadastro',
        area: 'gestao',
        status: 'ACTIVE',
        createdAt: '2026-05-12T00:00:00Z',
        updatedAt: '2026-05-12T00:00:00Z',
      }))
      .mockResolvedValueOnce(mockJsonResponse({
        id: 'perm-1',
        key: 'cadastro:obras:obra:visualizar',
        displayName: 'Visualizar obra',
        domain: 'cadastro',
        area: 'obras',
        status: 'ACTIVE',
      }));

    await createRole({
      key: 'cadastro.gestao.analista',
      displayName: 'Analista de Cadastro',
      description: null,
      domain: 'cadastro',
      area: 'gestao',
    });
    await addPermissionToRole('role-1', 'cadastro:obras:obra:visualizar');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/authz/v1/roles',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect((fetchMock.mock.calls[0][1] as RequestInit).body).toBe(JSON.stringify({
      key: 'cadastro.gestao.analista',
      displayName: 'Analista de Cadastro',
      description: null,
      domain: 'cadastro',
      area: 'gestao',
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/authz/v1/roles/role-1/permissions',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect((fetchMock.mock.calls[1][1] as RequestInit).body).toBe(JSON.stringify({
      permissionKey: 'cadastro:obras:obra:visualizar',
    }));
  });

  it('loads and updates role details through the AuthZ BFF path', async () => {
    const role = {
      id: 'role-1',
      key: 'cadastro.gestao.analista',
      displayName: 'Analista de Cadastro',
      description: 'Escopo inicial',
      domain: 'cadastro',
      area: 'gestao',
      status: 'ACTIVE',
      createdAt: '2026-05-12T00:00:00Z',
      updatedAt: '2026-05-12T00:00:00Z',
    };
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(mockJsonResponse(role))
      .mockResolvedValueOnce(mockJsonResponse({ ...role, displayName: 'Analista revisado' }));

    await getRole('role-1');
    await updateRole('role-1', {
      displayName: 'Analista revisado',
      description: null,
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/authz/v1/roles/role-1',
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/authz/v1/roles/role-1',
      expect.objectContaining({ method: 'PUT' }),
    );
    expect((fetchMock.mock.calls[1][1] as RequestInit).body).toBe(JSON.stringify({
      displayName: 'Analista revisado',
      description: null,
    }));
  });

  it('deactivates roles and manages role permissions through the AuthZ BFF path', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(mockJsonResponse({
        id: 'role-1',
        key: 'cadastro.gestao.analista',
        displayName: 'Analista de Cadastro',
        domain: 'cadastro',
        area: 'gestao',
        status: 'INACTIVE',
        createdAt: '2026-05-12T00:00:00Z',
        updatedAt: '2026-05-12T00:00:00Z',
      }))
      .mockResolvedValueOnce(mockJsonResponse([
        {
          id: 'perm-1',
          key: 'cadastro:obras:obra:visualizar',
          displayName: 'Visualizar obra',
          domain: 'cadastro',
          area: 'obras',
          status: 'ACTIVE',
        },
      ]))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    await deactivateRole('role-1');
    await listRolePermissions('role-1');
    await removePermissionFromRole('role-1', 'perm-1');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/authz/v1/roles/role-1/deactivate',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/authz/v1/roles/role-1/permissions',
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/authz/v1/roles/role-1/permissions/perm-1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
