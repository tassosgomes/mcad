import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { BffConfig } from './config.js';
import { buildServer } from './server.js';

const BASE_CONFIG: BffConfig = {
  host: '127.0.0.1',
  port: 0,
  requestBodyLimitBytes: 1024,
  auditScreenAccessMaxResponseBytes: 1024,
  corsAllowedOrigins: ['https://mcad.tasso.dev.br'],
  enableLegacyCadastroRoute: false,
  authzBaseUrl: 'http://authz.local',
  authzTimeoutMs: 3000,
  meCacheTtlSeconds: 0,
  auditBaseUrl: 'http://audit.local/api/v1/audit',
  auditTimeoutMs: 5000,
  upstreams: [],
};

function authzContext(permissions: string[]) {
  return {
    user: {
      id: 'actor-user',
      subject: 'actor-sub',
      email: 'actor@mcad.local',
      name: 'Actor',
    },
    roles: [],
    permissions,
    scopes: [],
    menus: [],
    remotes: [],
    version: 1,
    expiresInSeconds: 300,
  };
}

function buildFakeFetch(
  handler: (
    url: string,
    init: { method?: string; headers?: Record<string, string>; body?: string },
  ) => { status: number; body?: unknown; headers?: Record<string, string> },
) {
  const calls: Array<{ url: string; method: string; body?: string }> = [];

  const fetchImpl = (async (
    input: string,
    init?: { method?: string; headers?: Record<string, string>; body?: string },
  ) => {
    calls.push({ url: input, method: init?.method ?? 'GET', body: init?.body });
    const result = handler(input, init ?? {});
    return {
      status: result.status,
      headers: {
        get(name: string): string | null {
          const found = Object.keys(result.headers ?? {}).find(
            (k) => k.toLowerCase() === name.toLowerCase(),
          );
          return found ? (result.headers ?? {})[found] : null;
        },
      },
      async json() {
        return result.body;
      },
    };
  }) as unknown as typeof globalThis.fetch;

  return { fetchImpl, calls };
}

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const PERMISSION_DEPRECATED = {
  id: 'perm-1',
  key: 'authz:admin:permissao:visualizar',
  displayName: 'Visualizar permissão',
  status: 'DEPRECATED',
};

const PERMISSION_ACTIVE = {
  id: 'perm-2',
  key: 'authz:admin:permissao:criar',
  displayName: 'Criar permissão',
  status: 'ACTIVE',
};

const ROLE_WITH_PERM_ACTIVE = {
  id: 'role-1',
  key: 'authz.admin.gerente',
  displayName: 'Gerente Authz',
  status: 'ACTIVE',
};

const ROLE_WITHOUT_PERM_ACTIVE = {
  id: 'role-2',
  key: 'authz.admin.operador',
  displayName: 'Operador Authz',
  status: 'ACTIVE',
};

const ROLE_WITH_PERM_INACTIVE = {
  id: 'role-3',
  key: 'authz.admin.analista',
  displayName: 'Analista Authz',
  status: 'INACTIVE',
};

const ALL_ROLES_BODY = {
  content: [ROLE_WITH_PERM_ACTIVE, ROLE_WITHOUT_PERM_ACTIVE, ROLE_WITH_PERM_INACTIVE],
  page: 0,
  size: 200,
  totalElements: 3,
};

// role-1 and role-3 contain perm-1; role-2 does not
function rolePermissionsHandler(roleId: string, permId: string) {
  if (roleId === 'role-1' || roleId === 'role-3') {
    return [{ id: permId, key: 'authz:admin:permissao:visualizar' }];
  }
  return [];
}

function standardHandler(permissions: string[], permissionFixture: typeof PERMISSION_DEPRECATED) {
  return (url: string, _init: { method?: string }) => {
    if (url === 'http://authz.local/v1/me/authorization-context') {
      return { status: 200, body: authzContext(permissions), headers: { 'x-authz-version': '1' } };
    }

    if (url === `http://authz.local/v1/permissions/${permissionFixture.id}`) {
      return { status: 200, body: permissionFixture };
    }

    if (url.startsWith('http://authz.local/v1/roles?')) {
      return { status: 200, body: ALL_ROLES_BODY };
    }

    const rolePermMatch = /\/v1\/roles\/([^/]+)\/permissions/.exec(url);
    if (rolePermMatch) {
      return { status: 200, body: rolePermissionsHandler(rolePermMatch[1], permissionFixture.id) };
    }

    return { status: 404, body: { code: 'NOT_FOUND' } };
  };
}

// ---------------------------------------------------------------------------
// GET /api/autorizacao/permissoes/:id/papeis-vinculados
// ---------------------------------------------------------------------------

test('GET /api/autorizacao/permissoes/:id/papeis-vinculados without Authorization returns 401', async () => {
  const { fetchImpl, calls } = buildFakeFetch(
    standardHandler(['authz:admin:permission:visualizar'], PERMISSION_DEPRECATED),
  );
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject(
      '/api/autorizacao/permissoes/perm-1/papeis-vinculados',
    );
    assert.equal(response.statusCode, 401);
    assert.deepEqual(response.json(), { code: 'UNAUTHORIZED' });
    assert.equal(calls.length, 0);
  } finally {
    await server.close();
  }
});

test('GET /api/autorizacao/permissoes/:id/papeis-vinculados without required permission returns 403', async () => {
  const { fetchImpl } = buildFakeFetch(standardHandler([], PERMISSION_DEPRECATED));
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/autorizacao/permissoes/perm-1/papeis-vinculados',
      headers: { authorization: 'Bearer token' },
    });
    assert.equal(response.statusCode, 403);
    assert.equal(response.json().code, 'PERMISSION_DENIED');
  } finally {
    await server.close();
  }
});

test('GET /api/autorizacao/permissoes/:id/papeis-vinculados with unknown id returns 404', async () => {
  const { fetchImpl } = buildFakeFetch((url, _init) => {
    if (url === 'http://authz.local/v1/me/authorization-context') {
      return {
        status: 200,
        body: authzContext(['authz:admin:permission:visualizar']),
        headers: { 'x-authz-version': '1' },
      };
    }
    if (url === 'http://authz.local/v1/permissions/unknown-id') {
      return { status: 404, body: { code: 'PERMISSION_NOT_FOUND' } };
    }
    return { status: 500, body: {} };
  });
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/autorizacao/permissoes/unknown-id/papeis-vinculados',
      headers: { authorization: 'Bearer token' },
    });
    assert.equal(response.statusCode, 404);
    assert.equal(response.json().code, 'PERMISSION_NOT_FOUND');
  } finally {
    await server.close();
  }
});

test('GET /api/autorizacao/permissoes/:id/papeis-vinculados returns 503 when upstream fails', async () => {
  const { fetchImpl } = buildFakeFetch((url, _init) => {
    if (url === 'http://authz.local/v1/me/authorization-context') {
      return {
        status: 200,
        body: authzContext(['authz:admin:permission:visualizar']),
        headers: { 'x-authz-version': '1' },
      };
    }
    if (url === `http://authz.local/v1/permissions/${PERMISSION_DEPRECATED.id}`) {
      return { status: 500, body: {} };
    }
    return { status: 500, body: {} };
  });
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/autorizacao/permissoes/perm-1/papeis-vinculados',
      headers: { authorization: 'Bearer token' },
    });
    assert.equal(response.statusCode, 503);
    assert.equal(response.json().code, 'AUTHZ_UNAVAILABLE');
  } finally {
    await server.close();
  }
});

test('GET /api/autorizacao/permissoes/:id/papeis-vinculados - DEPRECATED with no active linked roles returns canRemove true', async () => {
  // Only role-3 (INACTIVE) contains perm-1; role-1 does NOT in this scenario
  const { fetchImpl, calls } = buildFakeFetch((url, _init) => {
    if (url === 'http://authz.local/v1/me/authorization-context') {
      return {
        status: 200,
        body: authzContext(['authz:admin:permission:visualizar']),
        headers: { 'x-authz-version': '1' },
      };
    }
    if (url === `http://authz.local/v1/permissions/${PERMISSION_DEPRECATED.id}`) {
      return { status: 200, body: PERMISSION_DEPRECATED };
    }
    if (url.startsWith('http://authz.local/v1/roles?')) {
      return {
        status: 200,
        body: {
          content: [ROLE_WITH_PERM_INACTIVE, ROLE_WITHOUT_PERM_ACTIVE],
          page: 0,
          size: 200,
          totalElements: 2,
        },
      };
    }
    const rolePermMatch = /\/v1\/roles\/([^/]+)\/permissions/.exec(url);
    if (rolePermMatch) {
      const roleId = rolePermMatch[1];
      // Only INACTIVE role (role-3) contains the permission
      const perms = roleId === 'role-3' ? [{ id: 'perm-1', key: PERMISSION_DEPRECATED.key }] : [];
      return { status: 200, body: perms };
    }
    return { status: 404, body: { code: 'NOT_FOUND' } };
  });
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/autorizacao/permissoes/perm-1/papeis-vinculados',
      headers: { authorization: 'Bearer token' },
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      permissionId: string;
      permissionStatus: string;
      linkedRoles: Array<{ id: string; status: string }>;
      canRemove: boolean;
      blockingReason?: string;
    };
    assert.equal(body.permissionId, 'perm-1');
    assert.equal(body.permissionStatus, 'DEPRECATED');
    assert.equal(body.canRemove, true);
    assert.equal(body.blockingReason, undefined);
    // role-3 (INACTIVE) is still in linkedRoles for display purposes
    assert.equal(body.linkedRoles.length, 1);
    assert.equal(body.linkedRoles[0].id, 'role-3');
    // Verify the roles call was made with correct query params
    const rolesCall = calls.find((c) => c.url.includes('/v1/roles?'));
    assert.ok(rolesCall?.url.includes('size=200'));
    assert.ok(rolesCall?.url.includes('sort=displayName,asc'));
  } finally {
    await server.close();
  }
});

test('GET /api/autorizacao/permissoes/:id/papeis-vinculados - DEPRECATED with no linked roles at all returns canRemove true', async () => {
  const { fetchImpl } = buildFakeFetch((url, _init) => {
    if (url === 'http://authz.local/v1/me/authorization-context') {
      return {
        status: 200,
        body: authzContext(['authz:admin:permission:visualizar']),
        headers: { 'x-authz-version': '1' },
      };
    }
    if (url === `http://authz.local/v1/permissions/${PERMISSION_DEPRECATED.id}`) {
      return { status: 200, body: PERMISSION_DEPRECATED };
    }
    if (url.startsWith('http://authz.local/v1/roles?')) {
      return { status: 200, body: { content: [ROLE_WITHOUT_PERM_ACTIVE], page: 0, size: 200, totalElements: 1 } };
    }
    const rolePermMatch = /\/v1\/roles\/([^/]+)\/permissions/.exec(url);
    if (rolePermMatch) {
      return { status: 200, body: [] }; // no role has this permission
    }
    return { status: 404, body: { code: 'NOT_FOUND' } };
  });
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/autorizacao/permissoes/perm-1/papeis-vinculados',
      headers: { authorization: 'Bearer token' },
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as { canRemove: boolean; linkedRoles: unknown[]; blockingReason?: string };
    assert.equal(body.canRemove, true);
    assert.equal(body.linkedRoles.length, 0);
    assert.equal(body.blockingReason, undefined);
  } finally {
    await server.close();
  }
});

test('GET /api/autorizacao/permissoes/:id/papeis-vinculados - ACTIVE permission returns blockingReason STATUS_NOT_DEPRECATED', async () => {
  const { fetchImpl } = buildFakeFetch(standardHandler(['authz:admin:permission:visualizar'], PERMISSION_ACTIVE));
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/autorizacao/permissoes/perm-2/papeis-vinculados',
      headers: { authorization: 'Bearer token' },
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as { canRemove: boolean; blockingReason: string; permissionStatus: string };
    assert.equal(body.canRemove, false);
    assert.equal(body.blockingReason, 'STATUS_NOT_DEPRECATED');
    assert.equal(body.permissionStatus, 'ACTIVE');
  } finally {
    await server.close();
  }
});

test('GET /api/autorizacao/permissoes/:id/papeis-vinculados - DEPRECATED with ACTIVE linked roles returns blockingReason ROLE_LINKS_PRESENT', async () => {
  // role-1 (ACTIVE) contains perm-1 → blocks removal
  const { fetchImpl } = buildFakeFetch(
    standardHandler(['authz:admin:permission:visualizar'], PERMISSION_DEPRECATED),
  );
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/autorizacao/permissoes/perm-1/papeis-vinculados',
      headers: { authorization: 'Bearer token' },
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      canRemove: boolean;
      blockingReason: string;
      linkedRoles: Array<{ id: string; status: string }>;
    };
    assert.equal(body.canRemove, false);
    assert.equal(body.blockingReason, 'ROLE_LINKS_PRESENT');
    // linkedRoles should include both ACTIVE role-1 and INACTIVE role-3
    const linkedIds = body.linkedRoles.map((r) => r.id).sort();
    assert.deepEqual(linkedIds, ['role-1', 'role-3']);
  } finally {
    await server.close();
  }
});

test('GET /api/autorizacao/permissoes/:id/papeis-vinculados returns 503 when fan-out fails', async () => {
  const { fetchImpl } = buildFakeFetch((url, _init) => {
    if (url === 'http://authz.local/v1/me/authorization-context') {
      return {
        status: 200,
        body: authzContext(['authz:admin:permission:visualizar']),
        headers: { 'x-authz-version': '1' },
      };
    }
    if (url === `http://authz.local/v1/permissions/${PERMISSION_DEPRECATED.id}`) {
      return { status: 200, body: PERMISSION_DEPRECATED };
    }
    if (url.startsWith('http://authz.local/v1/roles?')) {
      return {
        status: 200,
        body: { content: [ROLE_WITH_PERM_ACTIVE], page: 0, size: 200, totalElements: 1 },
      };
    }
    // fan-out call fails
    if (/\/v1\/roles\/[^/]+\/permissions/.test(url)) {
      return { status: 500, body: {} };
    }
    return { status: 404, body: { code: 'NOT_FOUND' } };
  });
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/autorizacao/permissoes/perm-1/papeis-vinculados',
      headers: { authorization: 'Bearer token' },
    });
    assert.equal(response.statusCode, 503);
    assert.equal(response.json().code, 'AUTHZ_UNAVAILABLE');
  } finally {
    await server.close();
  }
});

// ---------------------------------------------------------------------------
// POST /api/autorizacao/permissoes/:id/depreciar
// ---------------------------------------------------------------------------

const DEPRECATED_RESULT = {
  ...PERMISSION_ACTIVE,
  id: 'perm-2',
  status: 'DEPRECATED',
};

function deprecateHandler(
  permissions: string[],
  deprecateStatus: number,
  deprecateBody: unknown = DEPRECATED_RESULT,
  authzVersionHeader?: string,
) {
  return (url: string, init: { method?: string }) => {
    if (url === 'http://authz.local/v1/me/authorization-context') {
      return { status: 200, body: authzContext(permissions), headers: { 'x-authz-version': '3' } as Record<string, string> };
    }

    if (
      url === `http://authz.local/v1/permissions/${PERMISSION_ACTIVE.id}/deprecate`
      && init.method === 'PATCH'
    ) {
      const headers: Record<string, string> = {};
      if (authzVersionHeader) headers['x-authz-version'] = authzVersionHeader;
      return { status: deprecateStatus, body: deprecateBody, headers };
    }

    // Catch audit event calls
    if (url === 'http://audit.local/api/v1/audit/events') {
      return { status: 201, body: {} };
    }

    return { status: 404, body: { code: 'NOT_FOUND' } };
  };
}

test('POST /api/autorizacao/permissoes/:id/depreciar without Authorization returns 401', async () => {
  const { fetchImpl, calls } = buildFakeFetch(
    deprecateHandler(['authz:admin:permission:depreciar'], 200),
  );
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'POST',
      url: '/api/autorizacao/permissoes/perm-2/depreciar',
    });
    assert.equal(response.statusCode, 401);
    assert.deepEqual(response.json(), { code: 'UNAUTHORIZED' });
    assert.equal(calls.length, 0);
  } finally {
    await server.close();
  }
});

test('POST /api/autorizacao/permissoes/:id/depreciar without deprecate permission returns 403', async () => {
  const { fetchImpl } = buildFakeFetch(deprecateHandler([], 200));
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'POST',
      url: '/api/autorizacao/permissoes/perm-2/depreciar',
      headers: { authorization: 'Bearer token' },
    });
    assert.equal(response.statusCode, 403);
    assert.equal(response.json().code, 'PERMISSION_DENIED');
  } finally {
    await server.close();
  }
});

test('POST /api/autorizacao/permissoes/:id/depreciar succeeds and returns deprecated permission', async () => {
  const { fetchImpl, calls } = buildFakeFetch(
    deprecateHandler(
      ['authz:admin:permission:depreciar'],
      200,
      DEPRECATED_RESULT,
      '5',
    ),
  );
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'POST',
      url: '/api/autorizacao/permissoes/perm-2/depreciar',
      headers: { authorization: 'Bearer token' },
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as { id: string; status: string };
    assert.equal(body.id, 'perm-2');
    assert.equal(body.status, 'DEPRECATED');

    // x-authz-version must be propagated from upstream response
    assert.equal(response.headers['x-authz-version'], '5');

    // Verify the PATCH was called with the correct URL
    const patchCall = calls.find(
      (c) => c.url.includes('/v1/permissions/perm-2/deprecate') && c.method === 'PATCH',
    );
    assert.ok(patchCall, 'PATCH call to ecad-authz not found');
  } finally {
    await server.close();
  }
});

test('POST /api/autorizacao/permissoes/:id/depreciar with x-authz-version from authz-context when upstream omits it', async () => {
  // upstream PATCH does not return x-authz-version; should fall back to context header
  const { fetchImpl } = buildFakeFetch(
    deprecateHandler(['authz:admin:permission:depreciar'], 200),
  );
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'POST',
      url: '/api/autorizacao/permissoes/perm-2/depreciar',
      headers: { authorization: 'Bearer token', 'x-authz-version': '2' },
    });
    assert.equal(response.statusCode, 200);
    // Falls back to request header value
    assert.equal(response.headers['x-authz-version'], '2');
  } finally {
    await server.close();
  }
});

test('POST /api/autorizacao/permissoes/:id/depreciar with unknown id returns 404', async () => {
  const { fetchImpl } = buildFakeFetch((url, init) => {
    if (url === 'http://authz.local/v1/me/authorization-context') {
      return {
        status: 200,
        body: authzContext(['authz:admin:permission:depreciar']),
        headers: { 'x-authz-version': '1' },
      };
    }
    if (url.includes('/v1/permissions/unknown-id/deprecate') && init.method === 'PATCH') {
      return { status: 404, body: { code: 'PERMISSION_NOT_FOUND', message: 'Permission not found' } };
    }
    if (url === 'http://audit.local/api/v1/audit/events') {
      return { status: 201, body: {} };
    }
    return { status: 404, body: { code: 'NOT_FOUND' } };
  });
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'POST',
      url: '/api/autorizacao/permissoes/unknown-id/depreciar',
      headers: { authorization: 'Bearer token' },
    });
    assert.equal(response.statusCode, 404);
    const body = response.json() as { code: string; message: string };
    assert.equal(body.code, 'PERMISSION_NOT_FOUND');
    assert.equal(body.message, 'Permission not found');
  } finally {
    await server.close();
  }
});

test('POST /api/autorizacao/permissoes/:id/depreciar returns 503 when ecad-authz is unavailable', async () => {
  const { fetchImpl } = buildFakeFetch((url, init) => {
    if (url === 'http://authz.local/v1/me/authorization-context') {
      return {
        status: 200,
        body: authzContext(['authz:admin:permission:depreciar']),
        headers: { 'x-authz-version': '1' },
      };
    }
    if (url.includes('/v1/permissions/perm-2/deprecate') && init.method === 'PATCH') {
      return { status: 500, body: {} };
    }
    if (url === 'http://audit.local/api/v1/audit/events') {
      return { status: 201, body: {} };
    }
    return { status: 404, body: { code: 'NOT_FOUND' } };
  });
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'POST',
      url: '/api/autorizacao/permissoes/perm-2/depreciar',
      headers: { authorization: 'Bearer token' },
    });
    assert.equal(response.statusCode, 503);
    assert.equal(response.json().code, 'AUTHZ_UNAVAILABLE');
  } finally {
    await server.close();
  }
});

test('POST /api/autorizacao/permissoes/:id/depreciar publishes audit event on success', async () => {
  const { fetchImpl, calls } = buildFakeFetch(
    deprecateHandler(['authz:admin:permission:depreciar'], 200, DEPRECATED_RESULT, '7'),
  );
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'POST',
      url: '/api/autorizacao/permissoes/perm-2/depreciar',
      headers: { authorization: 'Bearer token' },
    });
    assert.equal(response.statusCode, 200);

    // Wait a tick so fire-and-forget audit call can complete
    await new Promise((resolve) => setImmediate(resolve));

    const auditCall = calls.find((c) => c.url === 'http://audit.local/api/v1/audit/events');
    assert.ok(auditCall, 'audit event call not found');
    assert.equal(auditCall.method, 'POST');

    const auditPayload = JSON.parse(auditCall.body ?? '{}') as {
      eventType: string;
      action: string;
      outcome: string;
    };
    assert.equal(auditPayload.eventType, 'PERMISSION_LIFECYCLE');
    assert.equal(auditPayload.action, 'deprecate');
    assert.equal(auditPayload.outcome, 'SUCCESS');
  } finally {
    await server.close();
  }
});

test('POST /api/autorizacao/permissoes/:id/depreciar publishes FAILURE audit event on 404', async () => {
  const { fetchImpl, calls } = buildFakeFetch((url, init) => {
    if (url === 'http://authz.local/v1/me/authorization-context') {
      return {
        status: 200,
        body: authzContext(['authz:admin:permission:depreciar']),
        headers: { 'x-authz-version': '1' },
      };
    }
    if (url.includes('/v1/permissions/perm-2/deprecate') && init.method === 'PATCH') {
      return { status: 404, body: { code: 'PERMISSION_NOT_FOUND' } };
    }
    if (url === 'http://audit.local/api/v1/audit/events') {
      return { status: 201, body: {} };
    }
    return { status: 404, body: { code: 'NOT_FOUND' } };
  });
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'POST',
      url: '/api/autorizacao/permissoes/perm-2/depreciar',
      headers: { authorization: 'Bearer token' },
    });
    assert.equal(response.statusCode, 404);

    await new Promise((resolve) => setImmediate(resolve));

    const auditCall = calls.find((c) => c.url === 'http://audit.local/api/v1/audit/events');
    assert.ok(auditCall, 'audit event call not found');
    const auditPayload = JSON.parse(auditCall.body ?? '{}') as {
      outcome: string;
      errorCode: string;
    };
    assert.equal(auditPayload.outcome, 'FAILURE');
    assert.equal(auditPayload.errorCode, 'PERMISSION_NOT_FOUND');
  } finally {
    await server.close();
  }
});

// ---------------------------------------------------------------------------
// Phase 2 stubs — POST routes return 501 AUTHZ_PERMISSION_OPERATION_UNAVAILABLE
// ---------------------------------------------------------------------------

test('POST /api/autorizacao/permissoes without Authorization returns 401', async () => {
  const { fetchImpl } = buildFakeFetch(
    standardHandler(['authz:admin:permission:visualizar'], PERMISSION_DEPRECATED),
  );
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({ method: 'POST', url: '/api/autorizacao/permissoes' });
    assert.equal(response.statusCode, 401);
  } finally {
    await server.close();
  }
});

test('POST /api/autorizacao/permissoes returns 501 AUTHZ_PERMISSION_OPERATION_UNAVAILABLE', async () => {
  const { fetchImpl } = buildFakeFetch(
    standardHandler(['authz:admin:permission:visualizar'], PERMISSION_DEPRECATED),
  );
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'POST',
      url: '/api/autorizacao/permissoes',
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      payload: JSON.stringify({ key: 'authz:admin:permissao:criar' }),
    });
    assert.equal(response.statusCode, 501);
    const body = response.json() as { code: string; operation: string; phase: string };
    assert.equal(body.code, 'AUTHZ_PERMISSION_OPERATION_UNAVAILABLE');
    assert.equal(body.operation, 'create');
    assert.equal(body.phase, 'PHASE_2');
  } finally {
    await server.close();
  }
});

test('POST /api/autorizacao/permissoes/:id/reativar returns 501 AUTHZ_PERMISSION_OPERATION_UNAVAILABLE', async () => {
  const { fetchImpl } = buildFakeFetch(
    standardHandler(['authz:admin:permission:visualizar'], PERMISSION_DEPRECATED),
  );
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'POST',
      url: '/api/autorizacao/permissoes/perm-1/reativar',
      headers: { authorization: 'Bearer token' },
    });
    assert.equal(response.statusCode, 501);
    const body = response.json() as { code: string; operation: string; missingEndpoint: string };
    assert.equal(body.code, 'AUTHZ_PERMISSION_OPERATION_UNAVAILABLE');
    assert.equal(body.operation, 'reactivate');
    assert.ok(body.missingEndpoint.includes('reactivate'));
  } finally {
    await server.close();
  }
});

test('POST /api/autorizacao/permissoes/:id/remover returns 501 AUTHZ_PERMISSION_OPERATION_UNAVAILABLE', async () => {
  const { fetchImpl } = buildFakeFetch(
    standardHandler(['authz:admin:permission:visualizar'], PERMISSION_DEPRECATED),
  );
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'POST',
      url: '/api/autorizacao/permissoes/perm-1/remover',
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      payload: JSON.stringify({ confirmationText: 'CONFIRMO' }),
    });
    assert.equal(response.statusCode, 501);
    const body = response.json() as { code: string; operation: string; missingEndpoint: string };
    assert.equal(body.code, 'AUTHZ_PERMISSION_OPERATION_UNAVAILABLE');
    assert.equal(body.operation, 'remove');
    assert.ok(body.missingEndpoint.includes('remove'));
  } finally {
    await server.close();
  }
});
