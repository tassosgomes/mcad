import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { BffConfig } from './config/config.js';
import { buildServer } from './app/buildServer.js';
import { AUDITORIA_PERMISSIONS } from './modules/auditoria/auditoria.permissions.js';

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
const AUDIT_EVENTS_INGESTION_URL = 'http://audit.local/api/v1/audit/events';

function authzContext(permissions: string[] = []) {
  return {
    user: {
      id: 'user-42',
      subject: 'sub-42',
      email: 'tasso@mcad.local',
      name: 'Tasso Gomes',
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

    if (input === AUDIT_EVENTS_INGESTION_URL && call.method === 'POST') {
      return {
        status: 202,
        headers: { get: () => null },
        async json() {
          return undefined;
        },
      };
    }

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

test('GET /api/auditoria/v1/catalogo requires catalog permission', async () => {
  const { fetchImpl } = buildFakeFetch((url) => {
    if (url === 'http://authz.local/v1/me/authorization-context') {
      return { status: 200, body: authzContext() };
    }
    return { status: 500, body: { code: 'should-not-reach' } };
  });

  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/auditoria/v1/catalogo',
      headers: { authorization: 'Bearer token' },
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().code, 'FORBIDDEN');
  } finally {
    await server.close();
  }
});

test('GET /api/auditoria/v1/catalogo returns governed catalog with catalog permission', async () => {
  const { fetchImpl } = buildFakeFetch((url) => {
    if (url === 'http://authz.local/v1/me/authorization-context') {
      return { status: 200, body: authzContext([AUDITORIA_PERMISSIONS.catalogView]) };
    }
    return { status: 500, body: { code: 'should-not-reach' } };
  });

  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/auditoria/v1/catalogo',
      headers: { authorization: 'Bearer token' },
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as { items: Array<{ id: string; level: string }> };
    assert.ok(body.items.some((item) => item.id === 'auditoria.eventos.lista'));
    assert.ok(body.items.some((item) => item.id === 'cadastro.titulares.lista' && item.level === 'GOLD'));
  } finally {
    await server.close();
  }
});

test('GET /api/auditoria/v1/audit/events without Authorization returns 401', async () => {
  const { fetchImpl } = buildFakeFetch(() => ({ status: 500 }));
  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/auditoria/v1/audit/events',
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json().code, 'UNAUTHORIZED');
  } finally {
    await server.close();
  }
});

test('GET /api/auditoria/v1/audit/events requires event list permission', async () => {
  const { fetchImpl, calls } = buildFakeFetch((url) => {
    if (url === 'http://authz.local/v1/me/authorization-context') {
      return { status: 200, body: authzContext([AUDITORIA_PERMISSIONS.catalogView]) };
    }
    return { status: 500, body: { code: 'should-not-reach' } };
  });

  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/auditoria/v1/audit/events',
      headers: { authorization: 'Bearer token' },
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().code, 'FORBIDDEN');
    assert.equal(calls.some((call) => call.url.includes('/audit/events')), false);
  } finally {
    await server.close();
  }
});

test('GET /api/auditoria/eventos maps friendly filters, presents aliases and filters auditLevel client-side', async () => {
  const upstreamUrl = [
    'http://audit.local/api/v1/audit/events?',
    'actorUserId=user-1',
    '&screenId=cadastro.titulares.lista',
    '&fromUtc=2026-06-01T00%3A00%3A00Z',
    '&toUtc=2026-06-04T00%3A00%3A00Z',
    '&entityType=Titular',
    '&entityId=tit-1',
  ].join('');
  const { fetchImpl, calls } = buildFakeFetch((url) => {
    if (url === 'http://authz.local/v1/me/authorization-context') {
      return { status: 200, body: authzContext([AUDITORIA_PERMISSIONS.eventList]) };
    }
    if (url === upstreamUrl) {
      return {
        status: 200,
        body: {
          items: [
            {
              eventId: 'evt-gold',
              metadata: { auditLevel: 'GOLD' },
              screen: { screenId: 'CADASTRO_TITULARES' },
            },
            {
              eventId: 'evt-silver',
              metadata: { auditLevel: 'SILVER' },
              screen: { screenId: 'cadastro.obras.lista' },
            },
          ],
          page: 0,
          size: 20,
        },
      };
    }
    return { status: 404, body: { code: 'NOT_FOUND' } };
  });

  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'GET',
      url: [
        '/api/auditoria/eventos?',
        'usuario=user-1',
        '&tela=CADASTRO_TITULARES',
        '&from=2026-06-01T00%3A00%3A00Z',
        '&to=2026-06-04T00%3A00%3A00Z',
        '&entityType=Titular',
        '&entityId=tit-1',
        '&nivel=ouro',
      ].join(''),
      headers: { authorization: 'Bearer token' },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(calls.some((call) => call.url === upstreamUrl), true);
    assert.equal(response.headers['x-audit-level-filter'], 'client-side');

    const body = response.json() as {
      items: Array<{
        eventId: string;
        screen: { screenId: string; screenName: string; auditLevel: string };
      }>;
      _meta: { auditLevelFilter: { value: string; mode: string } };
    };
    assert.deepEqual(body.items.map((item) => item.eventId), ['evt-gold']);
    assert.equal(body.items[0]?.screen.screenId, 'cadastro.titulares.lista');
    assert.equal(body.items[0]?.screen.screenName, 'Cadastro - Titulares');
    assert.equal(body.items[0]?.screen.auditLevel, 'GOLD');
    assert.deepEqual(body._meta.auditLevelFilter, {
      value: 'GOLD',
      mode: 'client-side',
      reason: 'audit-service-v1-does-not-expose-native-audit-level-filter',
    });
  } finally {
    await server.close();
  }
});

test('GET /api/auditoria/eventos publishes own BFF SILVER SCREEN_ACCESS without snapshot', async () => {
  const upstreamUrl = 'http://audit.local/api/v1/audit/events?eventType=DATA_CHANGE';
  const { fetchImpl, calls } = buildFakeFetch((url) => {
    if (url === 'http://authz.local/v1/me/authorization-context') {
      return { status: 200, body: authzContext([AUDITORIA_PERMISSIONS.eventList]) };
    }
    if (url === upstreamUrl) {
      return {
        status: 200,
        body: {
          items: [
            {
              eventId: 'evt-change',
              eventType: 'DATA_CHANGE',
              screen: { screenId: 'cadastro.obras.lista' },
            },
          ],
          page: 0,
          size: 20,
        },
      };
    }
    return { status: 404, body: { code: 'NOT_FOUND' } };
  });

  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/auditoria/eventos?eventType=DATA_CHANGE',
      headers: { authorization: 'Bearer token' },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.headers['x-audit-screen-id'], 'auditoria.eventos.lista');

    const publishCall = calls.find((call) =>
      call.method === 'POST' && call.url === AUDIT_EVENTS_INGESTION_URL);
    assert.ok(publishCall, 'should publish SCREEN_ACCESS for own BFF route');

    const event = JSON.parse(publishCall.body ?? '{}') as {
      eventType: string;
      metadata: { auditLevel: string; upstreamName: string };
      screen: { screenId: string; businessContext: Record<string, unknown> };
    };

    assert.equal(event.eventType, 'SCREEN_ACCESS');
    assert.equal(event.metadata.auditLevel, 'SILVER');
    assert.equal(event.metadata.upstreamName, 'mcad-bff');
    assert.equal(event.screen.screenId, 'auditoria.eventos.lista');
    assert.equal(Object.prototype.hasOwnProperty.call(event.screen.businessContext, 'snapshot'), false);

    const metricsResponse = await server.inject({ method: 'GET', url: '/metrics' });
    assert.match(
      metricsResponse.body,
      /bff_audit_screen_access_total\{level="SILVER",outcome="captured",screenId="auditoria\.eventos\.lista"\} 1/,
    );
  } finally {
    await server.close();
  }
});

test('GET /api/auditoria/eventos rejects unsupported filters before hitting audit-service', async () => {
  const { fetchImpl, calls } = buildFakeFetch((url) => {
    if (url === 'http://authz.local/v1/me/authorization-context') {
      return { status: 200, body: authzContext([AUDITORIA_PERMISSIONS.eventList]) };
    }
    return { status: 500, body: { code: 'should-not-reach' } };
  });

  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/auditoria/eventos?senha=secret',
      headers: { authorization: 'Bearer token' },
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().code, 'INVALID_REQUEST');
    assert.equal(calls.some((call) => call.url.includes('/audit/events')), false);
  } finally {
    await server.close();
  }
});

test('GET /api/auditoria/v1/audit/events proxies list and redacts snapshots without snapshot permission', async () => {
  const upstreamUrl = 'http://audit.local/api/v1/audit/events?screenId=cadastro.titulares.lista';
  const { fetchImpl, calls } = buildFakeFetch((url) => {
    if (url === 'http://authz.local/v1/me/authorization-context') {
      return { status: 200, body: authzContext([AUDITORIA_PERMISSIONS.eventList]) };
    }
    if (url === upstreamUrl) {
      return {
        status: 200,
        body: {
          items: [
            {
              eventId: 'evt-1',
              payload: {
                screen: {
                  businessContext: {
                    auditLevel: 'GOLD',
                    snapshot: { body: { secret: 'cpf-completo' } },
                  },
                },
              },
            },
          ],
        },
      };
    }
    return { status: 404, body: { code: 'NOT_FOUND' } };
  });

  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/auditoria/v1/audit/events?screenId=cadastro.titulares.lista',
      headers: { authorization: 'Bearer token' },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(calls.some((call) => call.url === upstreamUrl), true);
    const body = response.json();
    assert.equal(JSON.stringify(body).includes('cpf-completo'), false);
    assert.equal(JSON.stringify(body).includes('snapshot'), false);
  } finally {
    await server.close();
  }
});

test('GET /api/auditoria/v1/audit/events/:eventId returns 403 for snapshot without snapshot permission', async () => {
  const upstreamUrl = 'http://audit.local/api/v1/audit/events/evt-ouro';
  const { fetchImpl } = buildFakeFetch((url) => {
    if (url === 'http://authz.local/v1/me/authorization-context') {
      return { status: 200, body: authzContext([AUDITORIA_PERMISSIONS.eventList]) };
    }
    if (url === upstreamUrl) {
      return {
        status: 200,
        body: {
          eventId: 'evt-ouro',
          screen: {
            businessContext: {
              auditLevel: 'GOLD',
              snapshot: { body: { secret: 'cpf-completo' } },
            },
          },
        },
      };
    }
    return { status: 404, body: { code: 'NOT_FOUND' } };
  });

  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/auditoria/v1/audit/events/evt-ouro',
      headers: { authorization: 'Bearer token' },
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().code, 'FORBIDDEN');
    assert.equal(response.body.includes('cpf-completo'), false);
  } finally {
    await server.close();
  }
});

test('GET /api/auditoria/v1/audit/events/:eventId returns snapshot with snapshot permission', async () => {
  const upstreamUrl = 'http://audit.local/api/v1/audit/events/evt-ouro';
  const { fetchImpl } = buildFakeFetch((url) => {
    if (url === 'http://authz.local/v1/me/authorization-context') {
      return {
        status: 200,
        body: authzContext([
          AUDITORIA_PERMISSIONS.eventList,
          AUDITORIA_PERMISSIONS.snapshotView,
        ]),
      };
    }
    if (url === upstreamUrl) {
      return {
        status: 200,
        body: {
          eventId: 'evt-ouro',
          screen: {
            businessContext: {
              auditLevel: 'GOLD',
              snapshot: { body: { secret: 'cpf-completo' } },
            },
          },
        },
      };
    }
    return { status: 404, body: { code: 'NOT_FOUND' } };
  });

  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/auditoria/v1/audit/events/evt-ouro',
      headers: { authorization: 'Bearer token' },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().screen.businessContext.snapshot.body.secret, 'cpf-completo');
  } finally {
    await server.close();
  }
});

test('GET /api/auditoria/eventos/:eventId returns friendly detail with snapshot permission', async () => {
  const upstreamUrl = 'http://audit.local/api/v1/audit/events/evt-ouro';
  const { fetchImpl } = buildFakeFetch((url) => {
    if (url === 'http://authz.local/v1/me/authorization-context') {
      return {
        status: 200,
        body: authzContext([
          AUDITORIA_PERMISSIONS.eventList,
          AUDITORIA_PERMISSIONS.snapshotView,
        ]),
      };
    }
    if (url === upstreamUrl) {
      return {
        status: 200,
        body: {
          eventId: 'evt-ouro',
          screen: {
            screenId: 'ARRECADACAO_PAGAMENTOS',
            businessContext: {
              auditLevel: 'GOLD',
              snapshot: { body: { valor: 100 } },
            },
          },
        },
      };
    }
    return { status: 404, body: { code: 'NOT_FOUND' } };
  });

  const server = await buildServer(BASE_CONFIG, { fetchImpl });

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/auditoria/eventos/evt-ouro',
      headers: { authorization: 'Bearer token' },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().screen.screenId, 'arrecadacao.pagamentos.lista');
    assert.equal(response.json().screen.screenName, 'Arrecadacao - Pagamentos');
    assert.equal(response.json().screen.businessContext.snapshot.body.valor, 100);
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
