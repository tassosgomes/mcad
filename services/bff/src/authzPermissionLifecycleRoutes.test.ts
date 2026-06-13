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

const ROLE_WITH_PERM_INACTIVE = {
  id: 'role-3',
  key: 'authz.admin.analista',
  displayName: 'Analista Authz',
  status: 'INACTIVE',
};

const ALL_ROLES_BODY = {
  content: [ROLE_WITH_PERM_ACTIVE, ROLE_WITH_PERM_INACTIVE],
  page: 0,
  size: 200,
  totalElements: 2,
};

function standardHandler(permissions: string[], permissionFixture: typeof PERMISSION_DEPRECATED) {
  return (url: string, _init: { method?: string }) => {
    if (url === 'http://authz.local/v1/me/authorization-context') {
      return { status: 200, body: authzContext(permissions), headers: { 'x-authz-version': '1' } };
    }

    if (url === `http://authz.local/v1/permissions/${permissionFixture.id}`) {
      return { status: 200, body: permissionFixture };
    }

    if (url.startsWith(`http://authz.local/v1/permissions/${permissionFixture.id}/roles?`)) {
      return { status: 200, body: ALL_ROLES_BODY };
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
    assert.equal(response.json().code, 'AUTHZ_SERVICE_UNAVAILABLE');
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
    if (url.startsWith('http://authz.local/v1/permissions/perm-1/roles?')) {
      return {
        status: 200,
        body: {
          content: [ROLE_WITH_PERM_INACTIVE],
          page: 0,
          size: 200,
          totalElements: 1,
        },
      };
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
    // Verify the official linked roles call was made with correct query params
    const rolesCall = calls.find((c) => c.url.includes('/v1/permissions/perm-1/roles?'));
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
    if (url.startsWith('http://authz.local/v1/permissions/perm-1/roles?')) {
      return { status: 200, body: { content: [], page: 0, size: 200, totalElements: 0 } };
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

test('GET /api/autorizacao/permissoes/:id/papeis-vinculados returns 503 when official linked roles lookup fails', async () => {
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
    if (url.startsWith('http://authz.local/v1/permissions/perm-1/roles?')) {
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
    assert.equal(response.json().code, 'AUTHZ_SERVICE_UNAVAILABLE');
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
    assert.equal(response.json().code, 'AUTHZ_SERVICE_UNAVAILABLE');
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
// POST /api/autorizacao/permissoes
// ---------------------------------------------------------------------------

const CREATE_PAYLOAD = {
  key: 'cadastro:obras:obra:aprovar',
  displayName: 'Aprovar obra',
  description: 'Permite aprovar obras.',
  domain: 'cadastro',
  area: 'obras',
  resource: 'obra',
  action: 'aprovar',
};

const CREATED_PERMISSION = {
  id: 'perm-new',
  ...CREATE_PAYLOAD,
  serviceName: 'ecad-authz-service',
  status: 'ACTIVE',
  createdAt: '2026-06-13T00:00:00Z',
  updatedAt: '2026-06-13T00:00:00Z',
};

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

test('POST /api/autorizacao/permissoes without create permission returns 403', async () => {
  const { fetchImpl } = buildFakeFetch(standardHandler([], PERMISSION_DEPRECATED));
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'POST',
      url: '/api/autorizacao/permissoes',
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      payload: JSON.stringify(CREATE_PAYLOAD),
    });
    assert.equal(response.statusCode, 403);
    assert.equal(response.json().code, 'PERMISSION_DENIED');
  } finally {
    await server.close();
  }
});

test('POST /api/autorizacao/permissoes creates permission via ecad-authz and propagates headers', async () => {
  const { fetchImpl, calls } = buildFakeFetch((url, init) => {
    if (url === 'http://authz.local/v1/me/authorization-context') {
      return {
        status: 200,
        body: authzContext(['authz:admin:permission:criar']),
        headers: { 'x-authz-version': '10' } as Record<string, string>,
      };
    }
    if (url === 'http://authz.local/v1/permissions' && init.method === 'POST') {
      return {
        status: 201,
        body: CREATED_PERMISSION,
        headers: {
          'x-authz-version': '11',
          'x-correlation-id': 'corr-created',
          location: '/v1/permissions/perm-new',
        } as Record<string, string>,
      };
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
      url: '/api/autorizacao/permissoes',
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      payload: JSON.stringify(CREATE_PAYLOAD),
    });
    assert.equal(response.statusCode, 201);
    assert.equal(response.headers['x-authz-version'], '11');
    assert.equal(response.headers['x-correlation-id'], 'corr-created');
    assert.equal(response.headers.location, '/v1/permissions/perm-new');
    assert.equal((response.json() as { status: string }).status, 'ACTIVE');

    const createCall = calls.find((c) => c.url === 'http://authz.local/v1/permissions');
    assert.ok(createCall, 'create upstream call not found');
    assert.equal(JSON.parse(createCall.body ?? '{}').key, CREATE_PAYLOAD.key);
  } finally {
    await server.close();
  }
});

test('POST /api/autorizacao/permissoes rejects invalid namespace before upstream call', async () => {
  const { fetchImpl, calls } = buildFakeFetch((url, _init) => {
    if (url === 'http://authz.local/v1/me/authorization-context') {
      return {
        status: 200,
        body: authzContext(['authz:admin:permission:criar']),
        headers: { 'x-authz-version': '10' },
      };
    }
    return { status: 404, body: { code: 'NOT_FOUND' } };
  });
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'POST',
      url: '/api/autorizacao/permissoes',
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      payload: JSON.stringify({ ...CREATE_PAYLOAD, key: 'cadastro:obras:obra:editar' }),
    });
    assert.equal(response.statusCode, 422);
    assert.equal(response.json().code, 'INVALID_PERMISSION_NAMESPACE');
    assert.equal(calls.some((c) => c.url === 'http://authz.local/v1/permissions'), false);
  } finally {
    await server.close();
  }
});

test('POST /api/autorizacao/permissoes forwards duplicate key errors from ecad-authz', async () => {
  const { fetchImpl } = buildFakeFetch((url, init) => {
    if (url === 'http://authz.local/v1/me/authorization-context') {
      return {
        status: 200,
        body: authzContext(['authz:admin:permission:criar']),
        headers: { 'x-authz-version': '10' },
      };
    }
    if (url === 'http://authz.local/v1/permissions' && init.method === 'POST') {
      return {
        status: 409,
        body: {
          code: 'PERMISSION_KEY_ALREADY_EXISTS',
          message: 'Permission key already exists',
          correlationId: 'corr-409',
        },
      };
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
      url: '/api/autorizacao/permissoes',
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      payload: JSON.stringify(CREATE_PAYLOAD),
    });
    assert.equal(response.statusCode, 409);
    assert.equal(response.json().code, 'PERMISSION_KEY_ALREADY_EXISTS');
    assert.equal(response.json().correlationId, 'corr-409');
  } finally {
    await server.close();
  }
});

// ---------------------------------------------------------------------------
// POST /api/autorizacao/permissoes/:id/reativar
// ---------------------------------------------------------------------------

test('POST /api/autorizacao/permissoes/:id/reativar calls upstream reactivate endpoint', async () => {
  const { fetchImpl, calls } = buildFakeFetch((url, init) => {
    if (url === 'http://authz.local/v1/me/authorization-context') {
      return {
        status: 200,
        body: authzContext(['authz:admin:permission:reativar']),
        headers: { 'x-authz-version': '10' },
      };
    }
    if (url === 'http://authz.local/v1/permissions/perm-1/reactivate' && init.method === 'POST') {
      return {
        status: 200,
        body: { ...PERMISSION_DEPRECATED, status: 'ACTIVE' },
        headers: { 'x-authz-version': '12' },
      };
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
      url: '/api/autorizacao/permissoes/perm-1/reativar',
      headers: { authorization: 'Bearer token' },
    });
    assert.equal(response.statusCode, 200);
    assert.equal(response.headers['x-authz-version'], '12');
    assert.equal((response.json() as { status: string }).status, 'ACTIVE');
    assert.ok(calls.find((c) => c.url.endsWith('/v1/permissions/perm-1/reactivate')));
  } finally {
    await server.close();
  }
});

test('POST /api/autorizacao/permissoes/:id/reativar forwards invalid transition error', async () => {
  const { fetchImpl } = buildFakeFetch((url, init) => {
    if (url === 'http://authz.local/v1/me/authorization-context') {
      return {
        status: 200,
        body: authzContext(['authz:admin:permission:reativar']),
        headers: { 'x-authz-version': '10' },
      };
    }
    if (url === 'http://authz.local/v1/permissions/perm-1/reactivate' && init.method === 'POST') {
      return {
        status: 422,
        body: { code: 'INVALID_PERMISSION_STATUS_TRANSITION', message: 'Invalid transition' },
      };
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
      url: '/api/autorizacao/permissoes/perm-1/reativar',
      headers: { authorization: 'Bearer token' },
    });
    assert.equal(response.statusCode, 422);
    assert.equal(response.json().code, 'INVALID_PERMISSION_STATUS_TRANSITION');
  } finally {
    await server.close();
  }
});

// ---------------------------------------------------------------------------
// POST /api/autorizacao/permissoes/:id/remover
// ---------------------------------------------------------------------------

test('POST /api/autorizacao/permissoes/:id/remover requires CONFIRMO confirmation', async () => {
  const { fetchImpl, calls } = buildFakeFetch((url, _init) => {
    if (url === 'http://authz.local/v1/me/authorization-context') {
      return {
        status: 200,
        body: authzContext(['authz:admin:permission:remover']),
        headers: { 'x-authz-version': '10' },
      };
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
      url: '/api/autorizacao/permissoes/perm-1/remover',
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      payload: JSON.stringify({ confirmationText: 'confirmo' }),
    });
    assert.equal(response.statusCode, 400);
    assert.equal(response.json().code, 'INVALID_CONFIRMATION');
    assert.equal(calls.some((c) => c.url.endsWith('/v1/permissions/perm-1/remove')), false);
  } finally {
    await server.close();
  }
});

test('POST /api/autorizacao/permissoes/:id/remover blocks active linked roles before upstream removal', async () => {
  const { fetchImpl, calls } = buildFakeFetch((url, _init) => {
    if (url === 'http://authz.local/v1/me/authorization-context') {
      return {
        status: 200,
        body: authzContext(['authz:admin:permission:remover']),
        headers: { 'x-authz-version': '10' },
      };
    }
    if (url === 'http://authz.local/v1/permissions/perm-1') {
      return { status: 200, body: PERMISSION_DEPRECATED };
    }
    if (url.startsWith('http://authz.local/v1/permissions/perm-1/roles?')) {
      return { status: 200, body: { content: [ROLE_WITH_PERM_ACTIVE], page: 0, size: 200, totalElements: 1 } };
    }
    return { status: 404, body: { code: 'NOT_FOUND' } };
  });
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'POST',
      url: '/api/autorizacao/permissoes/perm-1/remover',
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      payload: JSON.stringify({ confirmationText: 'CONFIRMO' }),
    });
    assert.equal(response.statusCode, 409);
    assert.equal(response.json().code, 'PERMISSION_IN_USE');
    assert.equal(calls.some((c) => c.url.endsWith('/v1/permissions/perm-1/remove')), false);
  } finally {
    await server.close();
  }
});

test('POST /api/autorizacao/permissoes/:id/remover calls upstream remove endpoint when eligible', async () => {
  const { fetchImpl, calls } = buildFakeFetch((url, init) => {
    if (url === 'http://authz.local/v1/me/authorization-context') {
      return {
        status: 200,
        body: authzContext(['authz:admin:permission:remover']),
        headers: { 'x-authz-version': '10' },
      };
    }
    if (url === 'http://authz.local/v1/permissions/perm-1') {
      return { status: 200, body: PERMISSION_DEPRECATED };
    }
    if (url.startsWith('http://authz.local/v1/permissions/perm-1/roles?')) {
      return { status: 200, body: { content: [], page: 0, size: 200, totalElements: 0 } };
    }
    if (url === 'http://authz.local/v1/permissions/perm-1/remove' && init.method === 'POST') {
      return {
        status: 200,
        body: { ...PERMISSION_DEPRECATED, status: 'DISABLED' },
        headers: { 'x-authz-version': '13' },
      };
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
      url: '/api/autorizacao/permissoes/perm-1/remover',
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      payload: JSON.stringify({ confirmationText: 'CONFIRMO' }),
    });
    assert.equal(response.statusCode, 200);
    assert.equal(response.headers['x-authz-version'], '13');
    assert.equal((response.json() as { status: string }).status, 'DISABLED');

    const removeCall = calls.find((c) => c.url === 'http://authz.local/v1/permissions/perm-1/remove');
    assert.ok(removeCall, 'remove upstream call not found');
    assert.deepEqual(JSON.parse(removeCall.body ?? '{}'), { confirmationText: 'CONFIRMO' });
  } finally {
    await server.close();
  }
});
