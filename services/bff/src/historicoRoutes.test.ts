import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { BffConfig } from './config.js';
import { buildServer } from './server.js';

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
  auditTimeoutMs: 20,
  upstreams: [],
};

const HISTORY_PERMISSION = 'distribuicao:default:processo:ver-historico-alteracoes';
const ASSIGNMENT_HISTORY_PERMISSION = 'acessos:default:atribuicao:ver-historico';

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
  handler: (url: string, init: { method?: string; headers?: Record<string, string>; signal?: AbortSignal }) => Promise<{
    status: number;
    body?: unknown;
  }> | {
    status: number;
    body?: unknown;
  },
) {
  const calls: Array<{ url: string; method: string; headers: Record<string, string> }> = [];
  const fetchImpl = (async (input: string, init?: { method?: string; headers?: Record<string, string>; signal?: AbortSignal }) => {
    calls.push({
      url: input,
      method: init?.method ?? 'GET',
      headers: init?.headers ?? {},
    });
    const result = await handler(input, init ?? {});

    return {
      status: result.status,
      headers: { get: () => null },
      async json() {
        return result.body;
      },
    };
  }) as unknown as typeof globalThis.fetch;

  return { fetchImpl, calls };
}

function standardHandler(permissions: string[], auditStatus = 200) {
  return (url: string) => {
    if (url === 'http://authz.local/v1/me/authorization-context') {
      return { status: 200, body: authzContext(permissions) };
    }
    if (url === 'http://audit.local/api/v1/audit/entities/Processo/proc-1/timeline') {
      return {
        status: auditStatus,
        body: auditStatus === 200
          ? {
              events: [
                {
                  id: 'evt-1',
                  eventType: 'DATA_CHANGE',
                  occurredAt: '2026-05-26T00:00:00Z',
                  entityType: 'Processo',
                  entityId: 'proc-1',
                },
              ],
              page: 0,
              size: 20,
              total: 1,
            }
          : { code: 'UPSTREAM_ERROR' },
      };
    }
    if (url.startsWith('http://audit.local/api/v1/audit/assignments/history')) {
      return {
        status: auditStatus,
        body: auditStatus === 200
          ? {
              events: [
                {
                  id: 'evt-assignment-1',
                  eventType: 'USER_ACTION',
                  occurredAt: '2026-05-27T00:00:00Z',
                  entityType: 'UserRoleAssignment',
                  action: 'ASSIGNED',
                  payload: {
                    targetUserId: 'user-1',
                    roleKey: 'distribuicao.default.gerente',
                  },
                },
              ],
              page: 0,
              size: 20,
              total: 1,
            }
          : { code: 'UPSTREAM_ERROR' },
      };
    }
    return { status: 404, body: { code: 'NOT_FOUND' } };
  };
}

test('GET historico without Authorization returns 401', async () => {
  const { fetchImpl, calls } = buildFakeFetch(standardHandler([]));
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject('/api/distribuicao/processos/proc-1/historico');
    assert.equal(response.statusCode, 401);
    assert.deepEqual(response.json(), { code: 'UNAUTHORIZED' });
    assert.equal(calls.length, 0);
  } finally {
    await server.close();
  }
});

test('GET historico without permission returns 403', async () => {
  const { fetchImpl } = buildFakeFetch(standardHandler([]));
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/distribuicao/processos/proc-1/historico',
      headers: { authorization: 'Bearer token' },
    });
    assert.equal(response.statusCode, 403);
    assert.equal(response.json().code, 'PERMISSION_DENIED');
  } finally {
    await server.close();
  }
});

test('GET historico with permission proxies audit payload and correlation-id', async () => {
  const { fetchImpl, calls } = buildFakeFetch(standardHandler([HISTORY_PERMISSION]));
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/distribuicao/processos/proc-1/historico',
      headers: {
        authorization: 'Bearer token',
        'x-correlation-id': 'corr-123',
      },
    });
    const auditCall = calls.find((call) => call.url.includes('/entities/Processo/'));

    assert.equal(response.statusCode, 200);
    assert.equal(response.headers['x-correlation-id'], 'corr-123');
    assert.equal(auditCall?.headers.authorization, 'Bearer token');
    assert.equal(auditCall?.headers['x-correlation-id'], 'corr-123');
    assert.equal(response.json().events.length, 1);
  } finally {
    await server.close();
  }
});

test('GET historico maps audit 404 to PROCESSO_NOT_FOUND', async () => {
  const { fetchImpl } = buildFakeFetch(standardHandler([HISTORY_PERMISSION], 404));
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/distribuicao/processos/proc-1/historico',
      headers: { authorization: 'Bearer token' },
    });
    assert.equal(response.statusCode, 404);
    assert.equal(response.json().code, 'PROCESSO_NOT_FOUND');
  } finally {
    await server.close();
  }
});

test('GET historico maps audit 500 to AUDIT_UNAVAILABLE', async () => {
  const { fetchImpl } = buildFakeFetch(standardHandler([HISTORY_PERMISSION], 500));
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/distribuicao/processos/proc-1/historico',
      headers: { authorization: 'Bearer token' },
    });
    assert.equal(response.statusCode, 503);
    assert.equal(response.json().code, 'AUDIT_UNAVAILABLE');
  } finally {
    await server.close();
  }
});

test('GET historico maps audit timeout to AUDIT_UNAVAILABLE', async () => {
  const { fetchImpl } = buildFakeFetch((url, init) => {
    if (url === 'http://authz.local/v1/me/authorization-context') {
      return { status: 200, body: authzContext([HISTORY_PERMISSION]) };
    }

    return new Promise((_, reject) => {
      init.signal?.addEventListener('abort', () => {
        reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
      });
    });
  });
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/distribuicao/processos/proc-1/historico',
      headers: { authorization: 'Bearer token' },
    });
    assert.equal(response.statusCode, 503);
    assert.equal(response.json().code, 'AUDIT_UNAVAILABLE');
  } finally {
    await server.close();
  }
});

test('GET historico maps malformed audit payload to 502', async () => {
  const { fetchImpl } = buildFakeFetch((url) => {
    if (url === 'http://authz.local/v1/me/authorization-context') {
      return { status: 200, body: authzContext([HISTORY_PERMISSION]) };
    }
    return { status: 200, body: ['not-an-object'] };
  });
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/distribuicao/processos/proc-1/historico',
      headers: { authorization: 'Bearer token' },
    });
    assert.equal(response.statusCode, 502);
    assert.equal(response.json().code, 'AUDIT_UNEXPECTED');
  } finally {
    await server.close();
  }
});

test('GET assignment history without permission returns 403', async () => {
  const { fetchImpl } = buildFakeFetch(standardHandler([]));
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/acessos/atribuicoes/historico?userId=user-1',
      headers: { authorization: 'Bearer token' },
    });
    assert.equal(response.statusCode, 403);
    assert.equal(response.json().code, 'PERMISSION_DENIED');
  } finally {
    await server.close();
  }
});

test('GET assignment history proxies audit payload with filters and correlation-id', async () => {
  const { fetchImpl, calls } = buildFakeFetch(standardHandler([ASSIGNMENT_HISTORY_PERMISSION]));
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/acessos/atribuicoes/historico?userId=user-1&roleKey=distribuicao.default.gerente&page=0&size=20',
      headers: {
        authorization: 'Bearer token',
        'x-correlation-id': 'corr-assignment',
      },
    });
    const auditCall = calls.find((call) => call.url.includes('/assignments/history'));

    assert.equal(response.statusCode, 200);
    assert.equal(response.headers['x-correlation-id'], 'corr-assignment');
    assert.equal(
      auditCall?.url,
      'http://audit.local/api/v1/audit/assignments/history?userId=user-1&roleKey=distribuicao.default.gerente&page=0&size=20',
    );
    assert.equal(auditCall?.headers.authorization, 'Bearer token');
    assert.equal(response.json().events[0].entityType, 'UserRoleAssignment');
  } finally {
    await server.close();
  }
});

test('GET assignment history without userId uses collection contract without fake timeline id', async () => {
  const { fetchImpl, calls } = buildFakeFetch(standardHandler([ASSIGNMENT_HISTORY_PERMISSION]));
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/acessos/atribuicoes/historico?roleKey=distribuicao.default.gerente&page=1&size=5',
      headers: { authorization: 'Bearer token' },
    });
    const auditCall = calls.find((call) => call.url.includes('/assignments/history'));

    assert.equal(response.statusCode, 200);
    assert.equal(
      auditCall?.url,
      'http://audit.local/api/v1/audit/assignments/history?roleKey=distribuicao.default.gerente&page=1&size=5',
    );
  } finally {
    await server.close();
  }
});

test('GET assignment history scoped permission sends domain filter on collection contract', async () => {
  const { fetchImpl, calls } = buildFakeFetch(standardHandler(['acessos:distribuicao:atribuicao:ver-historico']));
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/acessos/atribuicoes/historico?page=0&size=10',
      headers: { authorization: 'Bearer token' },
    });
    const auditCall = calls.find((call) => call.url.includes('/assignments/history'));

    assert.equal(response.statusCode, 200);
    assert.equal(auditCall?.url, 'http://audit.local/api/v1/audit/assignments/history?page=0&size=10&domain=distribuicao');
  } finally {
    await server.close();
  }
});

test('GET assignment history scoped permission rejects another role domain', async () => {
  const { fetchImpl } = buildFakeFetch(standardHandler(['acessos:distribuicao:atribuicao:ver-historico']));
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/acessos/atribuicoes/historico?userId=user-1&roleKey=cadastro.default.operador',
      headers: { authorization: 'Bearer token' },
    });
    assert.equal(response.statusCode, 403);
    assert.equal(response.json().code, 'PERMISSION_DENIED');
  } finally {
    await server.close();
  }
});

test('GET assignment history maps audit 500 to AUDIT_UNAVAILABLE', async () => {
  const { fetchImpl } = buildFakeFetch(standardHandler([ASSIGNMENT_HISTORY_PERMISSION], 500));
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/acessos/atribuicoes/historico?userId=user-1',
      headers: { authorization: 'Bearer token' },
    });
    assert.equal(response.statusCode, 503);
    assert.equal(response.json().code, 'AUDIT_UNAVAILABLE');
  } finally {
    await server.close();
  }
});
