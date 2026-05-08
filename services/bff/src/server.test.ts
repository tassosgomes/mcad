import assert from 'node:assert/strict';
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
