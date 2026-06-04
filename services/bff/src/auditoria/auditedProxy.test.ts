import assert from 'node:assert/strict';
import { type AddressInfo } from 'node:net';
import { createServer, type IncomingHttpHeaders, type IncomingMessage, type ServerResponse } from 'node:http';
import { test } from 'node:test';
import { buildServer } from '../server.js';
import type { BffConfig } from '../config.js';

interface CapturedRequest {
  method: string;
  url: string;
  headers: IncomingHttpHeaders;
  body: string;
}

interface TestHttpServer {
  url: string;
  requests: CapturedRequest[];
  close(): Promise<void>;
}

interface TestUpstreamOptions {
  name: string;
  prefix: string;
  basePath?: string;
}

const AUTHZ_PAYLOAD = {
  user: {
    id: 'usr-123',
    subject: 'keycloak|usr-123',
    email: 'maria@ecad.org.br',
    name: 'Maria Silva',
  },
  roles: ['cadastro.operador'],
  permissions: ['cadastro:default:titular:visualizar'],
  scopes: [],
  menus: [],
  remotes: [],
  version: 7,
  expiresInSeconds: 300,
};

async function readRequestBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString('utf8');
}

async function startTestServer(
  handler: (
    request: IncomingMessage,
    response: ServerResponse,
    captured: CapturedRequest,
  ) => void | Promise<void>,
): Promise<TestHttpServer | undefined> {
  const requests: CapturedRequest[] = [];
  const server = createServer((request, response) => {
    void (async () => {
      const captured = {
        method: request.method ?? '',
        url: request.url ?? '',
        headers: request.headers,
        body: await readRequestBody(request),
      };
      requests.push(captured);
      await handler(request, response, captured);
    })().catch((error) => {
      response.statusCode = 500;
      response.end(JSON.stringify({ code: 'TEST_SERVER_ERROR', message: String(error) }));
    });
  });

  try {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
  } catch (error) {
    server.close();

    if ((error as NodeJS.ErrnoException).code === 'EPERM') {
      return undefined;
    }

    throw error;
  }

  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    close: () => new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    }),
  };
}

async function startAuthzServer(): Promise<TestHttpServer | undefined> {
  return startTestServer((_request, response) => {
    response.setHeader('content-type', 'application/json');
    response.setHeader('x-authz-version', '7');
    response.end(JSON.stringify(AUTHZ_PAYLOAD));
  });
}

function buildConfig(
  upstream: TestHttpServer,
  authz: TestHttpServer,
  audit: TestHttpServer,
  overrides: Partial<BffConfig> = {},
  upstreamOptions: TestUpstreamOptions = {
    name: 'cadastro',
    prefix: '/api/cadastro/v1',
    basePath: '/api/v1',
  },
): BffConfig {
  return {
    host: '127.0.0.1',
    port: 0,
    requestBodyLimitBytes: 1024,
    auditScreenAccessMaxResponseBytes: 4096,
    corsAllowedOrigins: ['https://mcad.tasso.dev.br'],
    enableLegacyCadastroRoute: false,
    authzBaseUrl: authz.url,
    authzTimeoutMs: 3000,
    meCacheTtlSeconds: 60,
    auditBaseUrl: `${audit.url}/api/v1/audit`,
    auditTimeoutMs: 5000,
    upstreams: [
      {
        name: upstreamOptions.name,
        prefix: upstreamOptions.prefix,
        baseUrl: `${upstream.url}${upstreamOptions.basePath ?? '/api/v1'}`,
      },
    ],
    ...overrides,
  };
}

async function closeAll(servers: Array<TestHttpServer | undefined>): Promise<void> {
  for (const server of servers) {
    await server?.close();
  }
}

test('audited proxy publishes SILVER SCREEN_ACCESS without snapshot before returning JSON', async (t) => {
  const upstreamBody = JSON.stringify({ data: [{ id: 'obra-1', titulo: 'Samba' }] });
  const upstream = await startTestServer((_request, response) => {
    response.setHeader('content-type', 'application/json');
    response.end(upstreamBody);
  });
  const authz = await startAuthzServer();
  const audit = await startTestServer((_request, response) => {
    response.statusCode = 202;
    response.end();
  });

  if (!upstream || !authz || !audit) {
    t.skip('sandbox does not allow opening local HTTP sockets');
    await closeAll([upstream, authz, audit]);
    return;
  }

  const server = await buildServer(buildConfig(upstream, authz, audit));

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/cadastro/v1/obras?titulo=Samba&page=1&size=20',
      headers: {
        authorization: 'Bearer test-token',
        origin: 'https://mcad.tasso.dev.br',
      },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body, upstreamBody);
    assert.equal(upstream.requests[0]?.url, '/api/v1/obras?titulo=Samba&page=1&size=20');
    assert.equal(upstream.requests[0]?.headers['x-audit-screen-id'], 'cadastro.obras.lista');
    assert.equal(typeof response.headers['x-audit-screen-access-id'], 'string');
    assert.equal(response.headers['x-audit-screen-id'], 'cadastro.obras.lista');
    assert.equal(audit.requests.length, 1);

    const event = JSON.parse(audit.requests[0]?.body ?? '{}') as {
      eventType: string;
      metadata: { auditLevel: string; responseBytes: number };
      screen: { screenId: string; businessContext: Record<string, unknown> };
    };

    assert.equal(event.eventType, 'SCREEN_ACCESS');
    assert.equal(event.metadata.auditLevel, 'SILVER');
    assert.equal(event.metadata.responseBytes, Buffer.byteLength(upstreamBody));
    assert.equal(event.screen.screenId, 'cadastro.obras.lista');
    assert.equal(Object.prototype.hasOwnProperty.call(event.screen.businessContext, 'snapshot'), false);
  } finally {
    await server.close();
    await closeAll([upstream, authz, audit]);
  }
});

test('audited proxy publishes GOLD snapshot and ignores divergent frontend hint', async (t) => {
  const body = { data: [{ id: 'tit-1', nome: 'Maria' }], total: 1 };
  const upstream = await startTestServer((_request, response) => {
    response.setHeader('content-type', 'application/json');
    response.setHeader('x-total-count', '1');
    response.end(JSON.stringify(body));
  });
  const authz = await startAuthzServer();
  const audit = await startTestServer((_request, response) => {
    response.statusCode = 202;
    response.end();
  });

  if (!upstream || !authz || !audit) {
    t.skip('sandbox does not allow opening local HTTP sockets');
    await closeAll([upstream, authz, audit]);
    return;
  }

  const server = await buildServer(buildConfig(upstream, authz, audit));

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/cadastro/v1/titulares?nome=Maria',
      headers: {
        authorization: 'Bearer test-token',
        'x-audit-screen-id': 'cadastro.associacoes.lista',
        'x-audit-screen-access-id': 'forged-access',
        'x-audit-session-id': 'forged-audit-session',
        'x-session-id': 'forged-client-session',
      },
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), body);
    assert.equal(upstream.requests[0]?.headers['x-audit-screen-id'], 'cadastro.titulares.lista');
    assert.notEqual(upstream.requests[0]?.headers['x-audit-screen-access-id'], 'forged-access');
    assert.notEqual(upstream.requests[0]?.headers['x-audit-session-id'], 'forged-audit-session');
    assert.notEqual(upstream.requests[0]?.headers['x-audit-session-id'], 'forged-client-session');
    assert.equal(upstream.requests[0]?.headers['x-session-id'], undefined);
    assert.equal(response.headers['x-audit-session-id'], upstream.requests[0]?.headers['x-audit-session-id']);

    const event = JSON.parse(audit.requests[0]?.body ?? '{}') as {
      correlation: { userSessionId: string };
      metadata: { auditLevel: string };
      screen: {
        screenId: string;
        businessContext: {
          snapshot: {
            body: unknown;
            headers: Record<string, string>;
            statusCode: number;
          };
        };
      };
    };

    assert.equal(event.metadata.auditLevel, 'GOLD');
    assert.equal(event.correlation.userSessionId, upstream.requests[0]?.headers['x-audit-session-id']);
    assert.notEqual(event.correlation.userSessionId, 'forged-audit-session');
    assert.notEqual(event.correlation.userSessionId, 'forged-client-session');
    assert.equal(event.screen.screenId, 'cadastro.titulares.lista');
    assert.deepEqual(event.screen.businessContext.snapshot.body, body);
    assert.deepEqual(event.screen.businessContext.snapshot.headers, {
      'content-type': 'application/json',
      'x-total-count': '1',
    });
    assert.equal(event.screen.businessContext.snapshot.statusCode, 200);
  } finally {
    await server.close();
    await closeAll([upstream, authz, audit]);
  }
});

const mandatoryGoldSmokeCases = [
  {
    name: 'Cadastro Titulares',
    upstream: { name: 'cadastro', prefix: '/api/cadastro/v1' },
    url: '/api/cadastro/v1/titulares?nome=Maria',
    expectedUpstreamUrl: '/api/v1/titulares?nome=Maria',
    screenId: 'cadastro.titulares.lista',
  },
  {
    name: 'Arrecadacao Pagamentos',
    upstream: { name: 'arrecadacao', prefix: '/api/arrecadacao/v1' },
    url: '/api/arrecadacao/v1/pagamentos?periodo=2026-05',
    expectedUpstreamUrl: '/api/v1/pagamentos?periodo=2026-05',
    screenId: 'arrecadacao.pagamentos.lista',
  },
  {
    name: 'Arrecadacao Verbas',
    upstream: { name: 'arrecadacao', prefix: '/api/arrecadacao/v1' },
    url: '/api/arrecadacao/v1/verbas/agregado-por-rubrica?periodo=2026-05',
    expectedUpstreamUrl: '/api/v1/verbas/agregado-por-rubrica?periodo=2026-05',
    screenId: 'arrecadacao.verbas.lista',
  },
] as const;

for (const smokeCase of mandatoryGoldSmokeCases) {
  test(`audited proxy smoke publishes GOLD snapshot for ${smokeCase.name}`, async (t) => {
    const body = { data: [{ id: smokeCase.screenId, valor: 100 }], total: 1 };
    const upstream = await startTestServer((_request, response) => {
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify(body));
    });
    const authz = await startAuthzServer();
    const audit = await startTestServer((_request, response) => {
      response.statusCode = 202;
      response.end();
    });

    if (!upstream || !authz || !audit) {
      t.skip('sandbox does not allow opening local HTTP sockets');
      await closeAll([upstream, authz, audit]);
      return;
    }

    const server = await buildServer(buildConfig(upstream, authz, audit, {}, smokeCase.upstream));

    try {
      const response = await server.inject({
        method: 'GET',
        url: smokeCase.url,
        headers: { authorization: 'Bearer test-token' },
      });

      assert.equal(response.statusCode, 200);
      assert.deepEqual(response.json(), body);
      assert.equal(upstream.requests[0]?.url, smokeCase.expectedUpstreamUrl);
      assert.equal(upstream.requests[0]?.headers['x-audit-screen-id'], smokeCase.screenId);
      assert.equal(response.headers['x-audit-screen-id'], smokeCase.screenId);
      assert.equal(audit.requests.length, 1);

      const event = JSON.parse(audit.requests[0]?.body ?? '{}') as {
        metadata: { auditLevel: string; retentionDays: number };
        screen: {
          screenId: string;
          businessContext: {
            snapshot?: {
              body: unknown;
              statusCode: number;
            };
          };
        };
      };

      assert.equal(event.metadata.auditLevel, 'GOLD');
      assert.equal(event.metadata.retentionDays, 90);
      assert.equal(event.screen.screenId, smokeCase.screenId);
      assert.deepEqual(event.screen.businessContext.snapshot?.body, body);
      assert.equal(event.screen.businessContext.snapshot?.statusCode, 200);
    } finally {
      await server.close();
      await closeAll([upstream, authz, audit]);
    }
  });
}

const silverSmokeCases = [
  {
    name: 'Cadastro Obras',
    upstream: { name: 'cadastro', prefix: '/api/cadastro/v1' },
    url: '/api/cadastro/v1/obras?titulo=Samba',
    screenId: 'cadastro.obras.lista',
  },
  {
    name: 'Identificacao Captacoes',
    upstream: { name: 'identificacao', prefix: '/api/identificacao/v1' },
    url: '/api/identificacao/v1/captacoes?periodo=2026-05',
    screenId: 'identificacao.captacoes.lista',
  },
  {
    name: 'Arrecadacao Licencas',
    upstream: { name: 'arrecadacao', prefix: '/api/arrecadacao/v1' },
    url: '/api/arrecadacao/v1/licencas?usuarioMusicaId=um-1',
    screenId: 'arrecadacao.licencas.lista',
  },
  {
    name: 'Distribuicao Processos',
    upstream: { name: 'distribuicao', prefix: '/api/distribuicao/v1' },
    url: '/api/distribuicao/v1/processos?status=ABERTO',
    screenId: 'distribuicao.processos.lista',
  },
  {
    name: 'Auditoria Relatorios',
    upstream: { name: 'auditoria', prefix: '/api/auditoria/v1' },
    url: '/api/auditoria/v1/audit/reports?reportType=SCREEN_ACCESS',
    screenId: 'auditoria.relatorios.lista',
  },
] as const;

for (const smokeCase of silverSmokeCases) {
  test(`audited proxy smoke publishes SILVER access without snapshot for ${smokeCase.name}`, async (t) => {
    const upstream = await startTestServer((_request, response) => {
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ data: [{ id: smokeCase.screenId }] }));
    });
    const authz = await startAuthzServer();
    const audit = await startTestServer((_request, response) => {
      response.statusCode = 202;
      response.end();
    });

    if (!upstream || !authz || !audit) {
      t.skip('sandbox does not allow opening local HTTP sockets');
      await closeAll([upstream, authz, audit]);
      return;
    }

    const server = await buildServer(buildConfig(upstream, authz, audit, {}, smokeCase.upstream));

    try {
      const response = await server.inject({
        method: 'GET',
        url: smokeCase.url,
        headers: { authorization: 'Bearer test-token' },
      });

      assert.equal(response.statusCode, 200);
      assert.equal(response.headers['x-audit-screen-id'], smokeCase.screenId);
      assert.equal(audit.requests.length, 1);

      const event = JSON.parse(audit.requests[0]?.body ?? '{}') as {
        metadata: { auditLevel: string; retentionDays: number };
        screen: { screenId: string; businessContext: Record<string, unknown> };
      };

      assert.equal(event.metadata.auditLevel, 'SILVER');
      assert.equal(event.metadata.retentionDays, 90);
      assert.equal(event.screen.screenId, smokeCase.screenId);
      assert.equal(Object.prototype.hasOwnProperty.call(event.screen.businessContext, 'snapshot'), false);
    } finally {
      await server.close();
      await closeAll([upstream, authz, audit]);
    }
  });
}

test('audited proxy forwards screen access correlation headers to a later write command', async (t) => {
  const upstream = await startTestServer((_request, response, captured) => {
    response.setHeader('content-type', 'application/json');

    if (captured.method === 'POST') {
      response.statusCode = 201;
      response.end(JSON.stringify({ id: 'pag-2', status: 'CRIADO' }));
      return;
    }

    response.end(JSON.stringify({ data: [{ id: 'pag-1' }] }));
  });
  const authz = await startAuthzServer();
  const audit = await startTestServer((_request, response) => {
    response.statusCode = 202;
    response.end();
  });

  if (!upstream || !authz || !audit) {
    t.skip('sandbox does not allow opening local HTTP sockets');
    await closeAll([upstream, authz, audit]);
    return;
  }

  const server = await buildServer(buildConfig(
    upstream,
    authz,
    audit,
    {},
    { name: 'arrecadacao', prefix: '/api/arrecadacao/v1' },
  ));

  try {
    const traceparent = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
    const readResponse = await server.inject({
      method: 'GET',
      url: '/api/arrecadacao/v1/pagamentos?periodo=2026-05',
      headers: {
        authorization: 'Bearer test-token',
        traceparent,
      },
    });

    assert.equal(readResponse.statusCode, 200);
    assert.equal(readResponse.headers.traceparent, traceparent);

    const writeResponse = await server.inject({
      method: 'POST',
      url: '/api/arrecadacao/v1/pagamentos',
      headers: {
        authorization: 'Bearer test-token',
        'content-type': 'application/json',
        traceparent,
        'x-audit-screen-access-id': String(readResponse.headers['x-audit-screen-access-id']),
        'x-audit-screen-id': String(readResponse.headers['x-audit-screen-id']),
        'x-audit-screen-name': String(readResponse.headers['x-audit-screen-name']),
        'x-audit-route': String(readResponse.headers['x-audit-route']),
        'x-audit-session-id': String(readResponse.headers['x-audit-session-id']),
        'x-audit-command-id': String(readResponse.headers['x-audit-command-id']),
      },
      payload: { valor: 200 },
    });

    assert.equal(writeResponse.statusCode, 201);
    assert.equal(upstream.requests.length, 2);

    const readRequest = upstream.requests[0]!;
    const writeRequest = upstream.requests[1]!;

    assert.equal(writeRequest.method, 'POST');
    assert.equal(writeRequest.url, '/api/v1/pagamentos');
    assert.equal(writeRequest.headers['x-audit-screen-access-id'], readRequest.headers['x-audit-screen-access-id']);
    assert.equal(writeRequest.headers['x-audit-screen-id'], 'arrecadacao.pagamentos.lista');
    assert.equal(writeRequest.headers['x-audit-screen-name'], 'Arrecadacao - Pagamentos');
    assert.equal(writeRequest.headers['x-audit-route'], '/api/arrecadacao/v1/pagamentos?periodo=2026-05');
    assert.equal(writeRequest.headers['x-audit-session-id'], readRequest.headers['x-audit-session-id']);
    assert.equal(writeRequest.headers['x-audit-command-id'], readRequest.headers['x-audit-command-id']);
    assert.equal(writeRequest.headers.traceparent, traceparent);
    assert.equal(audit.requests.length, 1);
  } finally {
    await server.close();
    await closeAll([upstream, authz, audit]);
  }
});

test('audited proxy fail-closes when audit service is unavailable after upstream success', async (t) => {
  const upstream = await startTestServer((_request, response) => {
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ secret: 'nao-vazar' }));
  });
  const authz = await startAuthzServer();
  const audit = await startTestServer((_request, response) => {
    response.statusCode = 503;
    response.end();
  });

  if (!upstream || !authz || !audit) {
    t.skip('sandbox does not allow opening local HTTP sockets');
    await closeAll([upstream, authz, audit]);
    return;
  }

  const server = await buildServer(buildConfig(upstream, authz, audit));

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/cadastro/v1/titulares',
      headers: { authorization: 'Bearer test-token' },
    });

    assert.equal(response.statusCode, 503);
    assert.deepEqual(response.json(), { code: 'AUDIT_UNAVAILABLE' });
    assert.equal(response.body.includes('nao-vazar'), false);
    assert.equal(audit.requests.length, 1);
  } finally {
    await server.close();
    await closeAll([upstream, authz, audit]);
  }
});

test('audited proxy does not publish success event for upstream errors', async (t) => {
  const upstream = await startTestServer((_request, response) => {
    response.statusCode = 404;
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ code: 'NOT_FOUND' }));
  });
  const authz = await startAuthzServer();
  const audit = await startTestServer((_request, response) => {
    response.statusCode = 202;
    response.end();
  });

  if (!upstream || !authz || !audit) {
    t.skip('sandbox does not allow opening local HTTP sockets');
    await closeAll([upstream, authz, audit]);
    return;
  }

  const server = await buildServer(buildConfig(upstream, authz, audit));

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/cadastro/v1/titulares/inexistente',
      headers: { authorization: 'Bearer test-token' },
    });

    assert.equal(response.statusCode, 404);
    assert.deepEqual(response.json(), { code: 'NOT_FOUND' });
    assert.equal(audit.requests.length, 0);
  } finally {
    await server.close();
    await closeAll([upstream, authz, audit]);
  }
});

test('audited proxy fails safely for GOLD non JSON upstream response', async (t) => {
  const upstream = await startTestServer((_request, response) => {
    response.setHeader('content-type', 'text/plain');
    response.end('nao-vazar');
  });
  const authz = await startAuthzServer();
  const audit = await startTestServer((_request, response) => {
    response.statusCode = 202;
    response.end();
  });

  if (!upstream || !authz || !audit) {
    t.skip('sandbox does not allow opening local HTTP sockets');
    await closeAll([upstream, authz, audit]);
    return;
  }

  const server = await buildServer(buildConfig(upstream, authz, audit));

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/cadastro/v1/titulares',
      headers: { authorization: 'Bearer test-token' },
    });

    assert.equal(response.statusCode, 502);
    assert.deepEqual(response.json(), { code: 'AUDIT_RESPONSE_NOT_JSON' });
    assert.equal(response.body.includes('nao-vazar'), false);
    assert.equal(audit.requests.length, 0);
  } finally {
    await server.close();
    await closeAll([upstream, authz, audit]);
  }
});

test('Bronze GET keeps the regular proxy path and does not call audit service', async (t) => {
  const upstream = await startTestServer((_request, response) => {
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ data: [{ id: 'assoc-1' }] }));
  });
  const authz = await startAuthzServer();
  const audit = await startTestServer((_request, response) => {
    response.statusCode = 202;
    response.end();
  });

  if (!upstream || !authz || !audit) {
    t.skip('sandbox does not allow opening local HTTP sockets');
    await closeAll([upstream, authz, audit]);
    return;
  }

  const server = await buildServer(buildConfig(upstream, authz, audit));

  try {
    const response = await server.inject({
      method: 'GET',
      url: '/api/cadastro/v1/associacoes',
      headers: { authorization: 'Bearer test-token' },
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { data: [{ id: 'assoc-1' }] });
    assert.equal(audit.requests.length, 0);
    assert.equal(authz.requests.length, 0);
  } finally {
    await server.close();
    await closeAll([upstream, authz, audit]);
  }
});
