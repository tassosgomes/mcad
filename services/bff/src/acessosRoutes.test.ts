import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { BffConfig } from './config.js';
import { buildServer } from './server.js';
import { deriveScopedDomains } from './acessosRoutes.js';
import { createMeCache } from './meCache.js';

const BASE_CONFIG: BffConfig = {
  host: '127.0.0.1',
  port: 0,
  requestBodyLimitBytes: 1024,
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
  handler: (url: string, init: { method?: string; headers?: Record<string, string>; body?: string }) => {
    status: number;
    body?: unknown;
    headers?: Record<string, string>;
  },
) {
  const calls: Array<{ url: string; method: string; headers: Record<string, string>; body?: string }> = [];
  const fetchImpl = (async (input: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => {
    const call = {
      url: input,
      method: init?.method ?? 'GET',
      headers: init?.headers ?? {},
      body: init?.body,
    };
    calls.push(call);
    const result = handler(input, init ?? {});

    return {
      status: result.status,
      headers: {
        get(name: string): string | null {
          const headers = result.headers ?? {};
          const found = Object.keys(headers).find((key) => key.toLowerCase() === name.toLowerCase());
          return found ? headers[found] : null;
        },
      },
      async json() {
        return result.body;
      },
    };
  }) as unknown as typeof globalThis.fetch;

  return { fetchImpl, calls };
}

function standardAuthzHandler(permissions: string[]) {
  return (url: string, init: { method?: string; body?: string }) => {
    if (url === 'http://authz.local/v1/me/authorization-context') {
      return { status: 200, body: authzContext(permissions), headers: { 'x-authz-version': '1' } };
    }

    if (url === 'http://authz.local/v1/users' || url.startsWith('http://authz.local/v1/users?')) {
      return {
        status: 200,
        body: {
          content: [
            { id: 'user-1', subject: 'sub-1', email: 'one@mcad.local', name: 'User One' },
            { id: 'user-2', subject: 'sub-2', email: 'two@mcad.local', name: 'User Two' },
          ],
          page: 0,
          size: 20,
          totalElements: 2,
        },
      };
    }

    if (url.startsWith('http://authz.local/v1/roles')) {
      return {
        status: 200,
        body: {
          content: [
            {
              id: 'role-distrib',
              key: 'distribuicao.default.gerente',
              domain: 'distribuicao',
              displayName: 'Gerente Distribuicao',
              type: 'BUILT_IN',
              status: 'ACTIVE',
              critical: true,
            },
            {
              id: 'role-cadastro',
              key: 'cadastro.default.operador',
              domain: 'cadastro',
              displayName: 'Operador Cadastro',
              type: 'BUILT_IN',
              status: 'ACTIVE',
            },
          ],
          page: 0,
          size: 200,
          totalElements: 2,
        },
      };
    }

    if (url === 'http://authz.local/v1/users/user-1/roles') {
      return {
        status: 200,
        body: [
          { id: 'assign-1', roleKey: 'distribuicao.default.gerente', status: 'ACTIVE' },
          { id: 'assign-2', roleKey: 'cadastro.default.operador', status: 'ACTIVE' },
        ],
      };
    }

    if (url === 'http://authz.local/v1/users/user-2/roles') {
      return {
        status: 200,
        body: [{ id: 'assign-3', roleKey: 'cadastro.default.operador', status: 'ACTIVE' }],
      };
    }

    if (url === 'http://authz.local/v1/users/target-user/roles' && init.method === 'POST') {
      assert.deepEqual(JSON.parse(init.body ?? '{}'), { roleKey: 'distribuicao.default.gerente' });
      return { status: 201, body: { id: 'assign-new' }, headers: { 'x-authz-version': '2' } };
    }

    if (url === 'http://authz.local/v1/users/target-user/roles/role-distrib' && init.method === 'DELETE') {
      return { status: 204, headers: { 'x-authz-version': '3' } };
    }

    return { status: 404, body: { code: 'NOT_FOUND' } };
  };
}

test('deriveScopedDomains detects full and scoped access', () => {
  assert.deepEqual(deriveScopedDomains(['acessos:default:papel:listar']), {
    allDomains: true,
    scoped: [],
  });
  assert.deepEqual(
    deriveScopedDomains([
      'acessos:distribuicao:papel:visualizar',
      'acessos:distribuicao:papel:visualizar',
      'acessos:cadastro:papel:visualizar',
      'acessos:default:papel:visualizar',
    ]),
    { allDomains: false, scoped: ['distribuicao', 'cadastro'] },
  );
});

test('GET /api/acessos/assignments without Authorization returns 401', async () => {
  const { fetchImpl, calls } = buildFakeFetch(standardAuthzHandler([]));
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject('/api/acessos/assignments');
    assert.equal(response.statusCode, 401);
    assert.deepEqual(response.json(), { code: 'UNAUTHORIZED' });
    assert.equal(calls.length, 0);
  } finally {
    await server.close();
  }
});

test('GET /api/acessos/usuarios requires usuario:listar permission and returns safe user fields', async () => {
  const deniedFetch = buildFakeFetch(standardAuthzHandler(['acessos:default:papel:listar'])).fetchImpl;
  const deniedServer = await buildServer(BASE_CONFIG, { fetchImpl: deniedFetch });

  try {
    const denied = await deniedServer.inject({
      method: 'GET',
      url: '/api/acessos/usuarios?query=user',
      headers: { authorization: 'Bearer token' },
    });
    assert.equal(denied.statusCode, 403);
  } finally {
    await deniedServer.close();
  }

  const { fetchImpl, calls } = buildFakeFetch(standardAuthzHandler(['acessos:default:usuario:listar']));
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const allowed = await server.inject({
      method: 'GET',
      url: '/api/acessos/usuarios?query=user&page=0&size=10',
      headers: { authorization: 'Bearer token' },
    });
    const body = allowed.json() as { items: Array<{ id: string; subject: string; email?: string; name?: string }> };
    const usersCall = calls.find((call) => call.url.startsWith('http://authz.local/v1/users?'));

    assert.equal(allowed.statusCode, 200);
    assert.equal(usersCall?.url, 'http://authz.local/v1/users?page=0&size=10&q=user');
    assert.deepEqual(body.items[0], {
      id: 'user-1',
      subject: 'sub-1',
      email: 'one@mcad.local',
      name: 'User One',
    });
  } finally {
    await server.close();
  }
});

test('GET /api/acessos/assignments without access permission returns 403', async () => {
  const { fetchImpl } = buildFakeFetch(standardAuthzHandler([]));
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/acessos/assignments',
      headers: { authorization: 'Bearer token' },
    });
    assert.equal(response.statusCode, 403);
    assert.equal(response.json().code, 'PERMISSION_DENIED');
  } finally {
    await server.close();
  }
});

test('GET /api/acessos/assignments with full permission returns all assignments', async () => {
  const { fetchImpl } = buildFakeFetch(standardAuthzHandler(['acessos:default:papel:listar']));
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/acessos/assignments?page=0&size=20&query=user',
      headers: { authorization: 'Bearer token' },
    });
    const body = response.json() as { items: Array<{ roles: Array<{ domain: string; assignmentId: string }> }>; total: number };

    assert.equal(response.statusCode, 200);
    assert.equal(body.items.length, 2);
    assert.equal(body.total, 2);
    assert.deepEqual(
      body.items.flatMap((item) => item.roles.map((role) => role.domain)).sort(),
      ['cadastro', 'cadastro', 'distribuicao'],
    );
    assert.equal(body.items[0].roles[0].assignmentId, 'user-1:role-distrib');
  } finally {
    await server.close();
  }
});

test('GET /api/acessos/assignments with scoped permission filters by domain', async () => {
  const { fetchImpl } = buildFakeFetch(standardAuthzHandler(['acessos:distribuicao:papel:visualizar']));
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/acessos/assignments',
      headers: { authorization: 'Bearer token' },
    });
    const body = response.json() as { items: Array<{ userId: string; roles: Array<{ domain: string }> }>; total: number };

    assert.equal(response.statusCode, 200);
    assert.deepEqual(body.items.map((item) => item.userId), ['user-1']);
    assert.deepEqual(body.items[0].roles.map((role) => role.domain), ['distribuicao']);
    assert.equal(body.total, 1);
  } finally {
    await server.close();
  }
});

test('GET /api/acessos/assignments maps authz upstream 503', async () => {
  const { fetchImpl } = buildFakeFetch((url) => {
    if (url === 'http://authz.local/v1/me/authorization-context') {
      return { status: 200, body: authzContext(['acessos:default:papel:listar']) };
    }
    return { status: 503, body: { code: 'DOWN' } };
  });
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/acessos/assignments',
      headers: { authorization: 'Bearer token' },
    });
    assert.equal(response.statusCode, 503);
    assert.equal(response.json().code, 'AUTHZ_UNAVAILABLE');
  } finally {
    await server.close();
  }
});

test('POST /api/acessos/papeis/atribuir requires atribuir permission', async () => {
  const { fetchImpl } = buildFakeFetch(standardAuthzHandler(['acessos:default:papel:listar']));
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'POST',
      url: '/api/acessos/papeis/atribuir',
      headers: { authorization: 'Bearer token' },
      payload: { userId: 'target-user', roleKey: 'distribuicao.default.gerente' },
    });
    assert.equal(response.statusCode, 403);
    assert.equal(response.json().code, 'PERMISSION_DENIED');
  } finally {
    await server.close();
  }
});

test('POST /api/acessos/papeis/atribuir proxies assignment and returns 204', async () => {
  const { fetchImpl } = buildFakeFetch(standardAuthzHandler(['acessos:default:papel:atribuir']));
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'POST',
      url: '/api/acessos/papeis/atribuir',
      headers: { authorization: 'Bearer token' },
      payload: { userId: 'target-user', roleKey: 'distribuicao.default.gerente' },
    });
    assert.equal(response.statusCode, 204);
    assert.equal(response.headers['x-authz-version'], '2');
  } finally {
    await server.close();
  }
});

test('POST /api/acessos/papeis/atribuir maps duplicate assignment to 409', async () => {
  const { fetchImpl } = buildFakeFetch((url, init) => {
    if (url === 'http://authz.local/v1/me/authorization-context') {
      return { status: 200, body: authzContext(['acessos:default:papel:atribuir']) };
    }

    if (url === 'http://authz.local/v1/users/target-user/roles' && init.method === 'POST') {
      return { status: 409, body: { code: 'ASSIGNMENT_ALREADY_EXISTS', message: 'Assignment already exists' } };
    }

    return { status: 404, body: { code: 'NOT_FOUND' } };
  });
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'POST',
      url: '/api/acessos/papeis/atribuir',
      headers: { authorization: 'Bearer token' },
      payload: { userId: 'target-user', roleKey: 'distribuicao.default.gerente' },
    });

    assert.equal(response.statusCode, 409);
    assert.deepEqual(response.json(), {
      code: 'ASSIGNMENT_ALREADY_EXISTS',
      message: 'Assignment already exists',
    });
  } finally {
    await server.close();
  }
});

test('POST /api/acessos/papeis/atribuir invalidates /api/me cache aliases for target user', async () => {
  const { fetchImpl } = buildFakeFetch(standardAuthzHandler(['acessos:default:papel:atribuir']));
  const cache = createMeCache();
  cache.set('target-sub', {
    ...authzContext([]),
    user: {
      id: 'target-user',
      subject: 'target-sub',
      email: 'target@mcad.local',
      name: 'Target User',
    },
    version: 1,
  }, 60);
  const server = await buildServer(BASE_CONFIG, { fetchImpl, meCache: cache });

  try {
    assert.equal(cache.size(), 1);

    const response = await server.inject({
      method: 'POST',
      url: '/api/acessos/papeis/atribuir',
      headers: { authorization: 'Bearer token' },
      payload: { userId: 'target-user', roleKey: 'distribuicao.default.gerente' },
    });

    assert.equal(response.statusCode, 204);
    assert.equal(cache.size(), 0);
  } finally {
    await server.close();
  }
});

test('DELETE /api/acessos/papeis/atribuir/:assignmentId requires remover permission', async () => {
  const { fetchImpl } = buildFakeFetch(standardAuthzHandler([]));
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'DELETE',
      url: `/api/acessos/papeis/atribuir/${encodeURIComponent('target-user:role-distrib')}`,
      headers: { authorization: 'Bearer token' },
    });
    assert.equal(response.statusCode, 403);
    assert.equal(response.json().code, 'PERMISSION_DENIED');
  } finally {
    await server.close();
  }
});

test('DELETE /api/acessos/papeis/atribuir/:assignmentId proxies removal and returns 204', async () => {
  const { fetchImpl } = buildFakeFetch(standardAuthzHandler(['acessos:default:papel:remover']));
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'DELETE',
      url: `/api/acessos/papeis/atribuir/${encodeURIComponent('target-user:role-distrib')}`,
      headers: { authorization: 'Bearer token' },
    });
    assert.equal(response.statusCode, 204);
    assert.equal(response.headers['x-authz-version'], '3');
  } finally {
    await server.close();
  }
});

test('GET /api/acessos/papeis requires listar permission and proxies catalog', async () => {
  const deniedFetch = buildFakeFetch(standardAuthzHandler([])).fetchImpl;
  const deniedServer = await buildServer(BASE_CONFIG, { fetchImpl: deniedFetch });

  try {
    const denied = await deniedServer.inject({
      method: 'GET',
      url: '/api/acessos/papeis',
      headers: { authorization: 'Bearer token' },
    });
    assert.equal(denied.statusCode, 403);
  } finally {
    await deniedServer.close();
  }

  const { fetchImpl } = buildFakeFetch(standardAuthzHandler(['acessos:default:papel:listar']));
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const allowed = await server.inject({
      method: 'GET',
      url: '/api/acessos/papeis?page=0&size=20',
      headers: { authorization: 'Bearer token' },
    });
    assert.equal(allowed.statusCode, 200);
    assert.equal(allowed.json().content.length, 2);
  } finally {
    await server.close();
  }
});

test('GET /api/acessos/papeis forwards filters and returns normalized critical flag', async () => {
  const { fetchImpl, calls } = buildFakeFetch(standardAuthzHandler(['acessos:default:papel:listar']));
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/acessos/papeis?domain=distribuicao&type=BUILT_IN&status=ACTIVE',
      headers: { authorization: 'Bearer token' },
    });
    const body = response.json() as { content: Array<{ key: string; critical: boolean; type: string; status: string }> };
    const rolesCall = calls.find((call) => call.url.startsWith('http://authz.local/v1/roles?'));

    assert.equal(response.statusCode, 200);
    assert.equal(rolesCall?.url, 'http://authz.local/v1/roles?domain=distribuicao&type=BUILT_IN&status=ACTIVE');
    assert.deepEqual(body.content, [
      {
        id: 'role-distrib',
        key: 'distribuicao.default.gerente',
        domain: 'distribuicao',
        displayName: 'Gerente Distribuicao',
        type: 'BUILT_IN',
        status: 'ACTIVE',
        critical: true,
      },
    ]);
  } finally {
    await server.close();
  }
});
