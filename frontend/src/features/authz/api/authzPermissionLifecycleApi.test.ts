import { afterEach, describe, expect, it, vi } from 'vitest';
import { setBffAuthTokenProvider } from '@services/apiBffClient';
import {
  createPermission,
  deprecatePermissionGoverned,
  getPermissionLinkedRoles,
  reactivatePermission,
  removePermission,
} from './authzPermissionLifecycleApi';

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

describe('authzPermissionLifecycleApi', () => {
  afterEach(() => {
    setBffAuthTokenProvider(null);
    vi.restoreAllMocks();
  });

  describe('getPermissionLinkedRoles', () => {
    it('fetches eligibility via BFF GET route with auth header', async () => {
      const eligibility = {
        permissionId: 'perm-1',
        permissionStatus: 'DEPRECATED',
        linkedRoles: [],
        canRemove: true,
      };
      const fetchMock = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(mockJsonResponse(eligibility));
      setBffAuthTokenProvider(() => 'token-abc');

      const result = await getPermissionLinkedRoles('perm-1');

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/autorizacao/permissoes/perm-1/papeis-vinculados',
        expect.objectContaining({ headers: expect.any(Headers) }),
      );
      const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer token-abc');
      expect(result.permissionId).toBe('perm-1');
      expect(result.canRemove).toBe(true);
      expect(result.linkedRoles).toHaveLength(0);
    });

    it('returns linked roles and blocking reason when active roles are present', async () => {
      const eligibility = {
        permissionId: 'perm-1',
        permissionStatus: 'DEPRECATED',
        linkedRoles: [
          {
            id: 'role-1',
            key: 'cadastro.obras.analista',
            displayName: 'Analista de Obras',
            status: 'ACTIVE',
          },
        ],
        canRemove: false,
        blockingReason: 'ROLE_LINKS_PRESENT',
      };
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockJsonResponse(eligibility));
      setBffAuthTokenProvider(() => 'token-abc');

      const result = await getPermissionLinkedRoles('perm-1');

      expect(result.canRemove).toBe(false);
      expect(result.blockingReason).toBe('ROLE_LINKS_PRESENT');
      expect(result.linkedRoles).toHaveLength(1);
      expect(result.linkedRoles[0].key).toBe('cadastro.obras.analista');
    });

    it('returns STATUS_NOT_DEPRECATED blocking reason when permission is still active', async () => {
      const eligibility = {
        permissionId: 'perm-2',
        permissionStatus: 'ACTIVE',
        linkedRoles: [],
        canRemove: false,
        blockingReason: 'STATUS_NOT_DEPRECATED',
      };
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockJsonResponse(eligibility));
      setBffAuthTokenProvider(() => 'token-abc');

      const result = await getPermissionLinkedRoles('perm-2');

      expect(result.canRemove).toBe(false);
      expect(result.blockingReason).toBe('STATUS_NOT_DEPRECATED');
    });

    it('encodes special characters in the permission ID', async () => {
      const fetchMock = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(
          mockJsonResponse({ permissionId: 'p/1', permissionStatus: 'ACTIVE', linkedRoles: [], canRemove: false }),
        );
      setBffAuthTokenProvider(() => 'token-abc');

      await getPermissionLinkedRoles('p/1');

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/autorizacao/permissoes/p%2F1/papeis-vinculados',
        expect.anything(),
      );
    });
  });

  describe('deprecatePermissionGoverned', () => {
    it('calls the governed BFF POST route for deprecation', async () => {
      const fetchMock = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(mockJsonResponse({ ...BASE_PERMISSION, status: 'DEPRECATED' }));
      setBffAuthTokenProvider(() => 'token-abc');

      const result = await deprecatePermissionGoverned('perm-1');

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/autorizacao/permissoes/perm-1/depreciar',
        expect.objectContaining({ method: 'POST' }),
      );
      expect(result.status).toBe('DEPRECATED');
      expect(result.id).toBe('perm-1');
    });

    it('throws when the BFF returns an error status', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        mockJsonResponse({ code: 'AUTHZ_UNAVAILABLE', message: 'upstream down' }, 503),
      );
      setBffAuthTokenProvider(() => 'token-abc');

      await expect(deprecatePermissionGoverned('perm-1')).rejects.toMatchObject({
        code: 'AUTHZ_UNAVAILABLE',
        status: 503,
      });
    });
  });

  describe('final lifecycle operations', () => {
    it('createPermission forwards to BFF POST and returns the created permission', async () => {
      const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        mockJsonResponse({
          ...BASE_PERMISSION,
          id: 'perm-new',
          key: 'cadastro:obras:obra:aprovar',
          displayName: 'Aprovar obra',
          action: 'aprovar',
        }, 201),
      );
      setBffAuthTokenProvider(() => 'token-abc');

      const result = await createPermission({
        key: 'cadastro:obras:obra:aprovar',
        displayName: 'Aprovar obra',
        domain: 'cadastro',
        area: 'obras',
        resource: 'obra',
        action: 'aprovar',
      });

      expect(result.id).toBe('perm-new');
      expect(result.status).toBe('ACTIVE');
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/autorizacao/permissoes',
        expect.objectContaining({ method: 'POST' }),
      );
      const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
      expect(body.key).toBe('cadastro:obras:obra:aprovar');
    });

    it('reactivatePermission calls BFF POST route and returns active permission', async () => {
      const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        mockJsonResponse({ ...BASE_PERMISSION, status: 'ACTIVE' }),
      );
      setBffAuthTokenProvider(() => 'token-abc');

      const result = await reactivatePermission('perm-1');

      expect(result.status).toBe('ACTIVE');
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/autorizacao/permissoes/perm-1/reativar',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('removePermission calls BFF POST route with confirmationText body and returns disabled permission', async () => {
      const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        mockJsonResponse({ ...BASE_PERMISSION, status: 'DISABLED' }),
      );
      setBffAuthTokenProvider(() => 'token-abc');

      const result = await removePermission('perm-1', 'CONFIRMO');

      expect(result.status).toBe('DISABLED');
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/autorizacao/permissoes/perm-1/remover',
        expect.objectContaining({ method: 'POST' }),
      );
      const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
      expect(body).toEqual({ confirmationText: 'CONFIRMO' });
    });
  });
});
