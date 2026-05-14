import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchPermissions, PERMISSIONS_API_PATH } from '../permissionsApi';
import { PermissionsUnauthorizedError } from '../types';

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

describe('permissionsApi.fetchPermissions', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the parsed payload and X-Authz-Version when the BFF responds 200', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(
        {
          subjectId: 'user-1',
          permissions: ['cadastro:default:obra:listar', 'cadastro:default:obra:criar'],
          version: 7,
        },
        { headers: { 'Content-Type': 'application/json', 'X-Authz-Version': '7' } },
      ),
    );

    const result = await fetchPermissions({ token: 'jwt-xyz' });

    expect(fetchMock).toHaveBeenCalledWith(
      PERMISSIONS_API_PATH,
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer jwt-xyz',
          Accept: 'application/json',
        }),
      }),
    );

    expect(result.data).toEqual({
      subjectId: 'user-1',
      permissions: ['cadastro:default:obra:listar', 'cadastro:default:obra:criar'],
      version: 7,
    });
    expect(result.authzVersionHeader).toBe('7');
  });

  it('propagates a PermissionsUnauthorizedError when the BFF responds 401 with code', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ code: 'INVALID_TOKEN', message: 'jwt expired' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(fetchPermissions({ token: 'jwt-xyz' })).rejects.toMatchObject({
      name: 'PermissionsUnauthorizedError',
      status: 401,
      code: 'INVALID_TOKEN',
    });
  });

  it('still throws an unauthorized error when the 401 body is not JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('not json', { status: 401 }),
    );

    const error = await fetchPermissions({ token: 'jwt-xyz' }).catch((e) => e);

    expect(error).toBeInstanceOf(PermissionsUnauthorizedError);
    expect(error.status).toBe(401);
  });

  it('throws a generic error for non-401 failures', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ code: 'AUTHZ_UNAVAILABLE' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(fetchPermissions({ token: 'jwt-xyz' })).rejects.toMatchObject({
      message: expect.stringContaining('HTTP 503'),
    });
  });

  it('throws when the payload shape is invalid', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ subjectId: 'user-1', permissions: 'not-an-array' }),
    );

    await expect(fetchPermissions({ token: 'jwt-xyz' })).rejects.toThrow(
      /permissions/i,
    );
  });

  it('uses the injected fetch implementation', async () => {
    const fakeFetch = vi.fn().mockResolvedValue(
      jsonResponse({ subjectId: 'user-1', permissions: [], version: 1 }),
    );

    await fetchPermissions({
      token: 'jwt-xyz',
      fetchImpl: fakeFetch as unknown as typeof fetch,
    });

    expect(fakeFetch).toHaveBeenCalledTimes(1);
  });
});
