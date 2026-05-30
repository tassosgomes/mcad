import assert from 'node:assert/strict';
import { type AddressInfo } from 'node:net';
import { createServer, type IncomingHttpHeaders } from 'node:http';
import { test } from 'node:test';
import { buildServer } from './server.js';
import type { BffConfig } from './config.js';
import { createMeCache } from './meCache.js';

function buildFakeJwt(claims: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `${header}.${payload}.`;
}

const ME_BASE_CONFIG: BffConfig = {
  host: '127.0.0.1',
  port: 0,
  requestBodyLimitBytes: 1024,
  corsAllowedOrigins: ['https://mcad.tasso.dev.br'],
  enableLegacyCadastroRoute: false,
  authzBaseUrl: 'http://localhost:8085',
  authzTimeoutMs: 3000,
  meCacheTtlSeconds: 60,
  auditBaseUrl: 'http://localhost:8090/api/v1/audit',
  auditTimeoutMs: 5000,
  upstreams: [],
};

function buildFakeFetch(handler: (url: string, init: { headers?: Record<string, string> }) => {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}) {
  let callCount = 0;
  const fetchImpl = (async (input: string, init?: { headers?: Record<string, string> }) => {
    callCount += 1;
    const result = handler(input, init ?? {});
    return {
      status: result.status,
      headers: {
        get(name: string): string | null {
          const headers = result.headers ?? {};
          const found = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
          return found ? headers[found] : null;
        },
      },
      async json() {
        return result.body;
      },
    };
  }) as unknown as typeof globalThis.fetch;

  return {
    fetchImpl,
    getCallCount: () => callCount,
  };
}

const SAMPLE_AUTHZ_PAYLOAD = {
  user: {
    id: 'usr-123',
    subject: 'cyberark|abc123',
    email: 'maria@ecad.org.br',
    name: 'Maria Silva',
    userType: 'ECAD_INTERNAL',
    department: 'distribuicao',
    businessArea: 'cadastro',
    adminArea: null,
  },
  roles: ['distribuicao.cadastro.operador'],
  permissions: ['distribuicao:cadastro:obra:visualizar', 'distribuicao:cadastro:obra:editar'],
  scopes: [],
  menus: [],
  remotes: [],
  version: 42,
  expiresInSeconds: 300,
};

test('health endpoints return bff status', async () => {
  const server = await buildServer({
    host: '127.0.0.1',
    port: 0,
    requestBodyLimitBytes: 1024,
    corsAllowedOrigins: ['https://mcad.tasso.dev.br'],
    enableLegacyCadastroRoute: false,
    authzBaseUrl: 'http://localhost:8085',
    authzTimeoutMs: 3000,
    meCacheTtlSeconds: 60,
    auditBaseUrl: 'http://localhost:8090/api/v1/audit',
    auditTimeoutMs: 5000,
    upstreams: [],
  });

  try {
    const liveResponse = await server.inject('/health/live');
    const readyResponse = await server.inject('/health/ready');

    assert.equal(liveResponse.statusCode, 200);
    assert.equal(readyResponse.statusCode, 200);
    assert.deepEqual(liveResponse.json(), {
      status: 'UP',
      service: 'mcad-bff',
    });
    assert.deepEqual(readyResponse.json(), {
      status: 'UP',
      upstreams: [],
    });
  } finally {
    await server.close();
  }
});

test('proxy rewrites route prefix and forwards query string and auth header', async (t) => {
  let receivedUrl = '';
  let receivedHeaders: IncomingHttpHeaders = {};

  const upstreamServer = createServer((request, response) => {
    receivedUrl = request.url ?? '';
    receivedHeaders = request.headers;

    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ ok: true }));
  });

  try {
    await new Promise<void>((resolve, reject) => {
      upstreamServer.once('error', reject);
      upstreamServer.listen(0, '127.0.0.1', resolve);
    });
  } catch (error) {
    upstreamServer.close();

    if ((error as NodeJS.ErrnoException).code === 'EPERM') {
      t.skip('sandbox does not allow opening a local upstream socket');
      return;
    }

    throw error;
  }

  const { port } = upstreamServer.address() as AddressInfo;
  const server = await buildServer({
    host: '127.0.0.1',
    port: 0,
    requestBodyLimitBytes: 1024,
    corsAllowedOrigins: ['https://mcad.tasso.dev.br'],
    enableLegacyCadastroRoute: false,
    authzBaseUrl: 'http://localhost:8085',
    authzTimeoutMs: 3000,
    meCacheTtlSeconds: 60,
    auditBaseUrl: 'http://localhost:8090/api/v1/audit',
    auditTimeoutMs: 5000,
    upstreams: [
      {
        name: 'identificacao',
        prefix: '/api/identificacao/v1',
        baseUrl: `http://127.0.0.1:${port}/api/v1`,
      },
    ],
  });

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/identificacao/v1/captacoes?page=1&size=20&sort=-periodo',
      headers: {
        authorization: 'Bearer test-token',
        origin: 'https://mcad.tasso.dev.br',
      },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(receivedUrl, '/api/v1/captacoes?page=1&size=20&sort=-periodo');
    assert.equal(receivedHeaders.authorization, 'Bearer test-token');
    assert.equal(receivedHeaders['x-mcad-bff-upstream'], 'identificacao');
    assert.equal(receivedHeaders['x-mcad-original-url'], '/api/identificacao/v1/captacoes?page=1&size=20&sort=-periodo');
    assert.equal(response.headers['x-mcad-bff-upstream'], 'identificacao');
    assert.equal(typeof response.headers['x-mcad-request-id'], 'string');
    assert.equal(response.headers['access-control-allow-origin'], 'https://mcad.tasso.dev.br');
  } finally {
    await server.close();
    await new Promise<void>((resolve, reject) => {
      upstreamServer.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
});

test('ai proxy rewrites chat route and forwards auth and mcad headers', async (t) => {
  let receivedMethod = '';
  let receivedUrl = '';
  let receivedBody = '';
  let receivedHeaders: IncomingHttpHeaders = {};

  const upstreamServer = createServer((request, response) => {
    receivedMethod = request.method ?? '';
    receivedUrl = request.url ?? '';
    receivedHeaders = request.headers;

    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      receivedBody += chunk;
    });
    request.on('end', () => {
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ answer: 'ok' }));
    });
  });

  try {
    await new Promise<void>((resolve, reject) => {
      upstreamServer.once('error', reject);
      upstreamServer.listen(0, '127.0.0.1', resolve);
    });
  } catch (error) {
    upstreamServer.close();

    if ((error as NodeJS.ErrnoException).code === 'EPERM') {
      t.skip('sandbox does not allow opening a local upstream socket');
      return;
    }

    throw error;
  }

  const { port } = upstreamServer.address() as AddressInfo;
  const server = await buildServer({
    host: '127.0.0.1',
    port: 0,
    requestBodyLimitBytes: 1024,
    corsAllowedOrigins: ['https://mcad.tasso.dev.br'],
    enableLegacyCadastroRoute: false,
    authzBaseUrl: 'http://localhost:8085',
    authzTimeoutMs: 3000,
    meCacheTtlSeconds: 60,
    auditBaseUrl: 'http://localhost:8090/api/v1/audit',
    auditTimeoutMs: 5000,
    upstreams: [
      {
        name: 'ai',
        prefix: '/api/ai/v1',
        baseUrl: `http://127.0.0.1:${port}/v1`,
      },
    ],
  });

  try {
    const response = await server.inject({
      method: 'POST',
      url: '/api/ai/v1/chat',
      headers: {
        authorization: 'Bearer ai-token',
        'content-type': 'application/json',
        origin: 'https://mcad.tasso.dev.br',
      },
      payload: {
        message: 'Explique a obra 123',
      },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(receivedMethod, 'POST');
    assert.equal(receivedUrl, '/v1/chat');
    assert.deepEqual(JSON.parse(receivedBody), {
      message: 'Explique a obra 123',
    });
    assert.equal(receivedHeaders.authorization, 'Bearer ai-token');
    assert.equal(receivedHeaders['x-mcad-bff-upstream'], 'ai');
    assert.equal(receivedHeaders['x-mcad-original-url'], '/api/ai/v1/chat');
    assert.equal(typeof receivedHeaders['x-mcad-request-id'], 'string');
    assert.equal(response.headers['x-mcad-bff-upstream'], 'ai');
    assert.equal(typeof response.headers['x-mcad-request-id'], 'string');
    assert.equal(response.headers['access-control-allow-origin'], 'https://mcad.tasso.dev.br');
  } finally {
    await server.close();
    await new Promise<void>((resolve, reject) => {
      upstreamServer.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
});

test('cors preflight is handled by the bff before proxying', async () => {
  const server = await buildServer({
    host: '127.0.0.1',
    port: 0,
    requestBodyLimitBytes: 1024,
    corsAllowedOrigins: ['https://mcad.tasso.dev.br'],
    enableLegacyCadastroRoute: false,
    authzBaseUrl: 'http://localhost:8085',
    authzTimeoutMs: 3000,
    meCacheTtlSeconds: 60,
    auditBaseUrl: 'http://localhost:8090/api/v1/audit',
    auditTimeoutMs: 5000,
    upstreams: [
      {
        name: 'authz',
        prefix: '/api/authz/v1',
        baseUrl: 'https://mcad-authz.tasso.dev.br/v1',
      },
    ],
  });

  try {
    const response = await server.inject({
      method: 'OPTIONS',
      url: '/api/authz/v1/permissions',
      headers: {
        origin: 'https://mcad.tasso.dev.br',
        'access-control-request-method': 'GET',
        'access-control-request-headers': 'authorization,content-type',
      },
    });

    assert.equal(response.statusCode, 204);
    assert.equal(response.headers['access-control-allow-origin'], 'https://mcad.tasso.dev.br');
    assert.equal(response.headers['access-control-allow-methods'], 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    assert.equal(response.headers['access-control-allow-headers'], 'authorization,content-type');
  } finally {
    await server.close();
  }
});

test('authz legacy v1 route forwards to authz upstream', async (t) => {
  let receivedUrl = '';
  let receivedHeaders: IncomingHttpHeaders = {};

  const upstreamServer = createServer((request, response) => {
    receivedUrl = request.url ?? '';
    receivedHeaders = request.headers;

    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ content: [] }));
  });

  try {
    await new Promise<void>((resolve, reject) => {
      upstreamServer.once('error', reject);
      upstreamServer.listen(0, '127.0.0.1', resolve);
    });
  } catch (error) {
    upstreamServer.close();

    if ((error as NodeJS.ErrnoException).code === 'EPERM') {
      t.skip('sandbox does not allow opening a local upstream socket');
      return;
    }

    throw error;
  }

  const { port } = upstreamServer.address() as AddressInfo;
  const server = await buildServer({
    host: '127.0.0.1',
    port: 0,
    requestBodyLimitBytes: 1024,
    corsAllowedOrigins: ['https://mcad.tasso.dev.br'],
    enableLegacyCadastroRoute: false,
    authzBaseUrl: 'http://localhost:8085',
    authzTimeoutMs: 3000,
    meCacheTtlSeconds: 60,
    auditBaseUrl: 'http://localhost:8090/api/v1/audit',
    auditTimeoutMs: 5000,
    upstreams: [
      {
        name: 'authz-legacy',
        prefix: '/v1',
        baseUrl: `http://127.0.0.1:${port}/v1`,
      },
    ],
  });

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/v1/permissions?page=0&size=20',
      headers: {
        authorization: 'Bearer test-token',
        origin: 'https://mcad.tasso.dev.br',
      },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(receivedUrl, '/v1/permissions?page=0&size=20');
    assert.equal(receivedHeaders.authorization, 'Bearer test-token');
    assert.equal(receivedHeaders['x-mcad-bff-upstream'], 'authz-legacy');
    assert.equal(response.headers['x-mcad-bff-upstream'], 'authz-legacy');
  } finally {
    await server.close();
    await new Promise<void>((resolve, reject) => {
      upstreamServer.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
});

test('/api/me returns 401 with UNAUTHORIZED when no bearer token is sent', async () => {
  const { fetchImpl, getCallCount } = buildFakeFetch(() => ({ status: 200, body: {} }));
  const server = await buildServer(ME_BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({ method: 'GET', url: '/api/me' });
    assert.equal(response.statusCode, 401);
    assert.deepEqual(response.json(), { code: 'UNAUTHORIZED' });
    assert.equal(getCallCount(), 0);
  } finally {
    await server.close();
  }
});

test('/api/me/permissions returns 401 with UNAUTHORIZED when no bearer token is sent', async () => {
  const { fetchImpl, getCallCount } = buildFakeFetch(() => ({ status: 200, body: {} }));
  const server = await buildServer(ME_BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({ method: 'GET', url: '/api/me/permissions' });
    assert.equal(response.statusCode, 401);
    assert.deepEqual(response.json(), { code: 'UNAUTHORIZED' });
    assert.equal(getCallCount(), 0);
  } finally {
    await server.close();
  }
});

test('/api/me returns subjectId, name and email from authz upstream', async () => {
  const { fetchImpl } = buildFakeFetch((url, init) => {
    assert.equal(url, 'http://localhost:8085/v1/me/authorization-context');
    assert.equal(init.headers?.authorization, 'Bearer some-token');
    return {
      status: 200,
      body: SAMPLE_AUTHZ_PAYLOAD,
      headers: { 'x-authz-version': '42' },
    };
  });
  const server = await buildServer(ME_BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/me',
      headers: { authorization: 'Bearer some-token' },
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      subjectId: 'cyberark|abc123',
      name: 'Maria Silva',
      email: 'maria@ecad.org.br',
      roles: SAMPLE_AUTHZ_PAYLOAD.roles,
      primaryRole: SAMPLE_AUTHZ_PAYLOAD.roles[0],
    });
  } finally {
    await server.close();
  }
});

test('/api/me/permissions returns subjectId, permissions and version, propagating X-Authz-Version', async () => {
  const { fetchImpl } = buildFakeFetch(() => ({
    status: 200,
    body: SAMPLE_AUTHZ_PAYLOAD,
    headers: { 'x-authz-version': '42' },
  }));
  const server = await buildServer(ME_BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/me/permissions',
      headers: { authorization: 'Bearer some-token' },
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      subjectId: 'cyberark|abc123',
      permissions: SAMPLE_AUTHZ_PAYLOAD.permissions,
      version: 42,
    });
    assert.equal(response.headers['x-authz-version'], '42');
  } finally {
    await server.close();
  }
});

test('/api/me caches successive calls within TTL and does not hit upstream twice', async () => {
  const { fetchImpl, getCallCount } = buildFakeFetch(() => ({
    status: 200,
    body: SAMPLE_AUTHZ_PAYLOAD,
    headers: { 'x-authz-version': '42' },
  }));
  const cache = createMeCache();
  const server = await buildServer(ME_BASE_CONFIG, { fetchImpl, meCache: cache });
  // JWT carrying sub matching authz payload user.subject so the cache key
  // lookup on the second request finds the cached entry.
  const token = buildFakeJwt({ sub: 'cyberark|abc123' });

  try {
    const first = await server.inject({
      method: 'GET',
      url: '/api/me',
      headers: { authorization: `Bearer ${token}` },
    });
    const second = await server.inject({
      method: 'GET',
      url: '/api/me',
      headers: { authorization: `Bearer ${token}` },
    });

    assert.equal(first.statusCode, 200);
    assert.equal(second.statusCode, 200);
    assert.deepEqual(second.json(), {
      subjectId: 'cyberark|abc123',
      name: 'Maria Silva',
      email: 'maria@ecad.org.br',
      roles: SAMPLE_AUTHZ_PAYLOAD.roles,
      primaryRole: SAMPLE_AUTHZ_PAYLOAD.roles[0],
    });
    assert.equal(getCallCount(), 1, 'upstream should be hit only once when cache is warm');
  } finally {
    await server.close();
  }
});

test('/api/me returns 503 AUTHZ_UNAVAILABLE when upstream returns 5xx', async () => {
  const { fetchImpl } = buildFakeFetch(() => ({ status: 502, body: { code: 'BAD_GATEWAY' } }));
  const cache = createMeCache();
  const server = await buildServer(ME_BASE_CONFIG, { fetchImpl, meCache: cache });

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/me',
      headers: { authorization: 'Bearer some-token' },
    });

    assert.equal(response.statusCode, 503);
    assert.deepEqual(response.json(), { code: 'AUTHZ_UNAVAILABLE' });
    assert.equal(cache.size(), 0, 'errors must not be cached');
  } finally {
    await server.close();
  }
});

test('/api/me returns 401 INVALID_TOKEN when upstream returns 401 with INVALID_TOKEN', async () => {
  const { fetchImpl } = buildFakeFetch(() => ({
    status: 401,
    body: { code: 'INVALID_TOKEN', message: 'Token invalido ou expirado.' },
  }));
  const server = await buildServer(ME_BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/me',
      headers: { authorization: 'Bearer some-token' },
    });

    assert.equal(response.statusCode, 401);
    const body = response.json() as { code: string };
    assert.equal(body.code, 'INVALID_TOKEN');
  } finally {
    await server.close();
  }
});

test('CT-BFF-R03a: meCache.maybeUpdateVersion invalida a entrada quando versão upstream é maior', () => {
  // Cobre o caminho de invalidação por versão dentro do cache em memória.
  // O cliente (frontend) chama `reload()` quando observa nova `X-Authz-Version`
  // no response; este teste exercita o helper que o BFF expõe para esse fluxo.
  const cache = createMeCache();
  cache.set('cyberark|abc123', SAMPLE_AUTHZ_PAYLOAD, 60);

  assert.equal(cache.size(), 1);
  assert.equal(cache.maybeUpdateVersion('cyberark|abc123', 42), false, 'mesma versão não invalida');
  assert.equal(cache.size(), 1);

  assert.equal(cache.maybeUpdateVersion('cyberark|abc123', 43), true, 'versão maior invalida');
  assert.equal(cache.size(), 0);
  assert.equal(cache.get('cyberark|abc123'), undefined);
});

test('CT-BFF-R03b: meCache.maybeUpdateVersion ignora subject desconhecido', () => {
  const cache = createMeCache();
  assert.equal(cache.maybeUpdateVersion('inexistente', 99), false);
});

test('CT-BFF-R03c: /api/me serve do cache até a entrada ser invalidada', async () => {
  // Cobre o gating do cache: invalidate() força próxima chamada a bater no upstream.
  let callCount = 0;
  const fetchImpl = (async () => {
    callCount += 1;
    return {
      status: 200,
      headers: {
        get(name: string): string | null {
          return name.toLowerCase() === 'x-authz-version' ? '42' : null;
        },
      },
      async json() {
        return SAMPLE_AUTHZ_PAYLOAD;
      },
    };
  }) as unknown as typeof globalThis.fetch;

  const cache = createMeCache();
  const server = await buildServer(ME_BASE_CONFIG, { fetchImpl, meCache: cache });
  const token = buildFakeJwt({ sub: 'cyberark|abc123' });

  try {
    // 1ª chamada: cache miss → bate no upstream.
    const first = await server.inject({
      method: 'GET',
      url: '/api/me',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(first.statusCode, 200);
    assert.equal(callCount, 1);

    // 2ª chamada: cache hit → não bate no upstream.
    const second = await server.inject({
      method: 'GET',
      url: '/api/me',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(second.statusCode, 200);
    assert.equal(callCount, 1, 'cache hit deve evitar chamada extra ao upstream');

    // Invalidar manualmente (simula version push ou logout) → próxima chamada bate no upstream.
    cache.invalidate('cyberark|abc123');
    const third = await server.inject({
      method: 'GET',
      url: '/api/me',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(third.statusCode, 200);
    assert.equal(callCount, 2, 'após invalidação, upstream deve ser consultado de novo');
  } finally {
    await server.close();
  }
});

test('/api/me returns 401 SESSION_REVOKED when upstream signals session revoked', async () => {
  const { fetchImpl } = buildFakeFetch(() => ({
    status: 401,
    body: { code: 'SESSION_REVOKED', message: 'Sessao revogada.' },
  }));
  const server = await buildServer(ME_BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/me',
      headers: { authorization: 'Bearer some-token' },
    });

    assert.equal(response.statusCode, 401);
    const body = response.json() as { code: string };
    assert.equal(body.code, 'SESSION_REVOKED');
  } finally {
    await server.close();
  }
});
