import assert from 'node:assert/strict';
import { type AddressInfo } from 'node:net';
import { createServer, type IncomingHttpHeaders } from 'node:http';
import { test } from 'node:test';
import { buildServer } from './server.js';

test('health endpoints return bff status', async () => {
  const server = await buildServer({
    host: '127.0.0.1',
    port: 0,
    requestBodyLimitBytes: 1024,
    enableLegacyCadastroRoute: false,
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
    enableLegacyCadastroRoute: false,
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
