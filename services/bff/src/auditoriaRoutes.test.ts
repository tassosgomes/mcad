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
  auditBaseUrl: 'http://audit.local/api/v1',
  auditTimeoutMs: 50,
  upstreams: [
    {
      name: 'auditoria',
      prefix: '/api/auditoria/v1',
      baseUrl: 'http://audit.local/api/v1',
    },
  ],
};

function authzContext() {
  return {
    user: {
      id: 'user-42',
      subject: 'sub-42',
      email: 'tasso@mcad.local',
      name: 'Tasso Gomes',
    },
    roles: [],
    permissions: [],
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
  ) => { status: number; body?: unknown },
) {
  const calls: Array<{
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
  }> = [];

  const fetchImpl = (async (
    input: string,
    init?: { method?: string; headers?: Record<string, string>; body?: string },
  ) => {
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
      headers: { get: () => null },
      async json() {
        return result.body;
      },
    };
  }) as unknown as typeof globalThis.fetch;

  return { fetchImpl, calls };
}

test('POST /api/auditoria/v1/audit/reports translates frontend payload and injects requestedBy', async () => {
  const upstreamUrl = 'http://audit.local/api/v1/audit/reports';
  const { fetchImpl, calls } = buildFakeFetch((url) => {
    if (url === 'http://authz.local/v1/me/authorization-context') {
      return { status: 200, body: authzContext() };
    }
    if (url === upstreamUrl) {
      return {
        status: 202,
        body: {
          reportId: 'rpt-1',
          reportType: 'DATA_CHANGE',
          status: 'PENDING',
          requestedBy: 'Tasso Gomes',
          requestedAtUtc: '2026-06-04T12:00:00Z',
          fromUtc: '2026-06-01T00:00:00Z',
          toUtc: '2026-06-04T00:00:00Z',
          errorMessage: null,
        },
      };
    }
    return { status: 404, body: { code: 'NOT_FOUND' } };
  });

  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'POST',
      url: '/api/auditoria/v1/audit/reports',
      headers: {
        authorization: 'Bearer token',
        'content-type': 'application/json',
      },
      payload: {
        reportType: 'DATA_CHANGE',
        from: '2026-06-01T00:00:00Z',
        to: '2026-06-04T00:00:00Z',
        filters: { entityType: 'Processo', actorUserId: 'user-1', screenId: '' },
        format: 'PDF',
      },
    });

    assert.equal(response.statusCode, 202);
    const upstreamCall = calls.find((call) => call.url === upstreamUrl);
    assert.ok(upstreamCall, 'should have hit audit-service');
    assert.equal(upstreamCall.method, 'POST');
    assert.equal(upstreamCall.headers.authorization, 'Bearer token');

    const sent = JSON.parse(upstreamCall.body ?? '{}');
    assert.deepEqual(sent, {
      reportType: 'DATA_CHANGE',
      requestedBy: 'Tasso Gomes',
      fromUtc: '2026-06-01T00:00:00Z',
      toUtc: '2026-06-04T00:00:00Z',
      filter: { entityType: 'Processo', actorUserId: 'user-1' },
    });

    const json = response.json() as { reportId: string };
    assert.equal(json.reportId, 'rpt-1');
  } finally {
    await server.close();
  }
});

test('POST /api/auditoria/v1/audit/reports rejects missing reportType', async () => {
  const { fetchImpl } = buildFakeFetch((url) => {
    if (url === 'http://authz.local/v1/me/authorization-context') {
      return { status: 200, body: authzContext() };
    }
    return { status: 500, body: { code: 'should-not-reach' } };
  });

  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'POST',
      url: '/api/auditoria/v1/audit/reports',
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      payload: { from: '2026-06-01T00:00:00Z', to: '2026-06-04T00:00:00Z' },
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().code, 'INVALID_REQUEST');
  } finally {
    await server.close();
  }
});

test('POST /api/auditoria/v1/audit/reports without Authorization returns 401', async () => {
  const { fetchImpl } = buildFakeFetch(() => ({ status: 500 }));
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'POST',
      url: '/api/auditoria/v1/audit/reports',
      headers: { 'content-type': 'application/json' },
      payload: { reportType: 'DATA_CHANGE', from: 'x', to: 'y' },
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json().code, 'UNAUTHORIZED');
  } finally {
    await server.close();
  }
});

test('POST /api/auditoria/v1/audit/reports propagates 400 from audit-service', async () => {
  const upstreamUrl = 'http://audit.local/api/v1/audit/reports';
  const { fetchImpl } = buildFakeFetch((url) => {
    if (url === 'http://authz.local/v1/me/authorization-context') {
      return { status: 200, body: authzContext() };
    }
    if (url === upstreamUrl) {
      return {
        status: 400,
        body: {
          type: 'about:blank',
          title: 'Invalid request',
          status: 400,
          detail: 'Request payload does not match the audit contract',
        },
      };
    }
    return { status: 404, body: { code: 'NOT_FOUND' } };
  });

  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'POST',
      url: '/api/auditoria/v1/audit/reports',
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      payload: {
        reportType: 'DATA_CHANGE',
        from: '2026-06-01T00:00:00Z',
        to: '2026-06-04T00:00:00Z',
        filters: {},
        format: 'PDF',
      },
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().title, 'Invalid request');
  } finally {
    await server.close();
  }
});
