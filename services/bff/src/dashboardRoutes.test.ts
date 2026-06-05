import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { BffConfig } from './config.js';
import { buildServer } from './server.js';

const TEST_CONFIG: BffConfig = {
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
  upstreams: [
    { name: 'cadastro', prefix: '/api/cadastro/v1', baseUrl: 'http://cadastro.local/api/v1' },
    { name: 'identificacao', prefix: '/api/identificacao/v1', baseUrl: 'http://identificacao.local/api/v1' },
    { name: 'arrecadacao', prefix: '/api/arrecadacao/v1', baseUrl: 'http://arrecadacao.local/api/v1' },
    { name: 'distribuicao', prefix: '/api/distribuicao/v1', baseUrl: 'http://distribuicao.local/api/v1' },
  ],
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
  handler: (url: string, init?: { headers?: Record<string, string> }) => {
    status: number;
    body?: unknown;
  },
) {
  const calls: Array<{ url: string; headers: Record<string, string> }> = [];
  const fetchImpl = (async (input: string, init?: { headers?: Record<string, string> }) => {
    calls.push({ url: input, headers: init?.headers ?? {} });
    const result = handler(input, init);
    return {
      status: result.status,
      ok: result.status >= 200 && result.status < 300,
      headers: {
        get(_name: string): string | null {
          return null;
        },
      },
      async json() {
        return result.body;
      },
    };
  }) as unknown as typeof globalThis.fetch;

  return { fetchImpl, calls };
}

test('GET /api/me/dashboard without authorization header returns 401', async () => {
  const { fetchImpl } = buildFakeFetch(() => ({ status: 200, body: {} }));
  const server = await buildServer(TEST_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/me/dashboard',
    });

    assert.equal(response.statusCode, 401);
    assert.deepEqual(response.json(), { code: 'UNAUTHORIZED' });
  } finally {
    await server.close();
  }
});

test('GET /api/me/dashboard with all permissions returns aggregated domains data', async () => {
  const permissions = [
    'cadastro:default:associacao:listar',
    'identificacao:default:captacao:listar',
    'arrecadacao:default:cliente:listar',
    'distribuicao:default:rubrica:listar',
  ];

  const { fetchImpl, calls } = buildFakeFetch((url) => {
    if (url === 'http://authz.local/v1/me/authorization-context') {
      return { status: 200, body: authzContext(permissions) };
    }
    if (url === 'http://cadastro.local/api/v1/dashboard/resumo') {
      return { status: 200, body: { totalObras: 100 } };
    }
    if (url === 'http://identificacao.local/api/v1/dashboard/resumo') {
      return { status: 200, body: { taxaMatch: 95.5 } };
    }
    if (url === 'http://arrecadacao.local/api/v1/dashboard/resumo') {
      return { status: 200, body: { totalLicencasAtivas: 50 } };
    }
    if (url === 'http://distribuicao.local/api/v1/dashboard/resumo') {
      return { status: 200, body: { statusUltimoCiclo: 'Finalizado' } };
    }
    return { status: 404 };
  });

  const server = await buildServer(TEST_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/me/dashboard',
      headers: { authorization: 'Bearer test-token' },
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.deepEqual(body, {
      cadastro: { totalObras: 100 },
      identificacao: { taxaMatch: 95.5 },
      arrecadacao: { totalLicencasAtivas: 50 },
      distribuicao: { statusUltimoCiclo: 'Finalizado' },
    });

    const urls = calls.map((c) => c.url).sort();
    assert.deepEqual(urls, [
      'http://arrecadacao.local/api/v1/dashboard/resumo',
      'http://authz.local/v1/me/authorization-context',
      'http://cadastro.local/api/v1/dashboard/resumo',
      'http://distribuicao.local/api/v1/dashboard/resumo',
      'http://identificacao.local/api/v1/dashboard/resumo',
    ]);
  } finally {
    await server.close();
  }
});

test('GET /api/me/dashboard with partial permissions filters out unauthorized domains', async () => {
  const permissions = [
    'cadastro:default:associacao:listar',
    // no identificacao permission
    'arrecadacao:default:cliente:listar',
    // no distribuicao permission
  ];

  const { fetchImpl, calls } = buildFakeFetch((url) => {
    if (url === 'http://authz.local/v1/me/authorization-context') {
      return { status: 200, body: authzContext(permissions) };
    }
    if (url === 'http://cadastro.local/api/v1/dashboard/resumo') {
      return { status: 200, body: { totalObras: 100 } };
    }
    if (url === 'http://arrecadacao.local/api/v1/dashboard/resumo') {
      return { status: 200, body: { totalLicencasAtivas: 50 } };
    }
    return { status: 404 };
  });

  const server = await buildServer(TEST_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/me/dashboard',
      headers: { authorization: 'Bearer test-token' },
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();
    // Identificação and Distribuição should be undefined/omitted
    assert.deepEqual(body, {
      cadastro: { totalObras: 100 },
      arrecadacao: { totalLicencasAtivas: 50 },
    });

    const urls = calls.map((c) => c.url).sort();
    assert.deepEqual(urls, [
      'http://arrecadacao.local/api/v1/dashboard/resumo',
      'http://authz.local/v1/me/authorization-context',
      'http://cadastro.local/api/v1/dashboard/resumo',
    ]);
  } finally {
    await server.close();
  }
});

test('GET /api/me/dashboard returns null for domains where downstream failed', async () => {
  const permissions = [
    'cadastro:default:associacao:listar',
    'identificacao:default:captacao:listar',
  ];

  const { fetchImpl } = buildFakeFetch((url) => {
    if (url === 'http://authz.local/v1/me/authorization-context') {
      return { status: 200, body: authzContext(permissions) };
    }
    if (url === 'http://cadastro.local/api/v1/dashboard/resumo') {
      return { status: 500, body: 'Internal Error' }; // Failed call
    }
    if (url === 'http://identificacao.local/api/v1/dashboard/resumo') {
      return { status: 200, body: { taxaMatch: 95.5 } };
    }
    return { status: 404 };
  });

  const server = await buildServer(TEST_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/me/dashboard',
      headers: { authorization: 'Bearer test-token' },
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.deepEqual(body, {
      cadastro: null, // failed upstream
      identificacao: { taxaMatch: 95.5 },
    });
  } finally {
    await server.close();
  }
});

test('GET /api/me/dashboard with no permissions returns empty response', async () => {
  const permissions: string[] = [];

  const { fetchImpl, calls } = buildFakeFetch((url) => {
    if (url === 'http://authz.local/v1/me/authorization-context') {
      return { status: 200, body: authzContext(permissions) };
    }
    return { status: 404 };
  });

  const server = await buildServer(TEST_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/me/dashboard',
      headers: { authorization: 'Bearer test-token' },
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {});
    assert.deepEqual(calls.map((c) => c.url), ['http://authz.local/v1/me/authorization-context']);
  } finally {
    await server.close();
  }
});
