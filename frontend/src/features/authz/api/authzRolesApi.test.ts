import { describe, expect, it, vi } from 'vitest';
import { setAuthzAuthTokenProvider } from '@services/apiAuthzClient';
import { addPermissionToRole, createRole, listRoles } from './authzRolesApi';

function mockJsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('authzRolesApi', () => {
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
});
