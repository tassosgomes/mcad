import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { test } from 'node:test';
import { buildServer } from '../index.js';
import type { AiOrchestratorConfig } from '../config/env.js';

const config: AiOrchestratorConfig = {
  host: '127.0.0.1',
  port: 0,
  environment: 'local',
  openAiApiKey: 'test-key',
  openAiModel: 'test-model',
  maxMessageChars: 4000,
  toolTimeoutMs: 1000,
  tracePrompts: false,
  runtimeAuthSecret: 'test-runtime-secret',
  upstreams: {
    cadastroBaseUrl: 'http://localhost:5001/api/v1',
    identificacaoBaseUrl: 'http://localhost:5100/api/v1',
    arrecadacaoBaseUrl: 'http://localhost:5003/api/v1',
    distribuicaoBaseUrl: 'http://localhost:5004/api/v1',
    auditoriaBaseUrl: 'http://localhost:5005/api/v1',
    authzBaseUrl: 'http://localhost:5200/api/authz/v1',
  },
};

function signRuntimeHeaders() {
  const timestamp = Date.now();
  const signature = createHmac('sha256', config.runtimeAuthSecret ?? '')
    .update(JSON.stringify({
      requestId: 'request-1',
      userId: 'user-1',
      displayName: '',
      permissions: ['cadastro.obras.read'],
      authzVersion: 42,
      timestamp,
    }))
    .digest('base64url');

  return {
    'x-mcad-runtime-auth-timestamp': String(timestamp),
    'x-mcad-runtime-auth-signature': signature,
  };
}

test('chat endpoint returns deterministic response in test mode', async () => {
  const server = await buildServer(config);

  try {
    const response = await server.inject({
      method: 'POST',
      url: '/v1/chat',
      headers: {
        authorization: 'Bearer local-token',
        'x-mcad-request-id': 'request-1',
        'x-mcad-bff-upstream': 'ai',
        'x-mcad-user-id': 'user-1',
        'x-mcad-permissions': 'cadastro.obras.read',
        'x-mcad-authz-version': '42',
        ...signRuntimeHeaders(),
      },
      payload: {
        message: 'Explique a obra 123',
      },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(typeof response.json().threadId, 'string');
    assert.deepEqual(response.json().toolCalls, []);
  } finally {
    await server.close();
  }
});

test('chat endpoint rejects unauthenticated requests', async () => {
  const server = await buildServer(config);

  try {
    const response = await server.inject({
      method: 'POST',
      url: '/v1/chat',
      payload: {
        message: 'Explique a obra 123',
      },
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json().title, 'Unauthorized');
  } finally {
    await server.close();
  }
});
