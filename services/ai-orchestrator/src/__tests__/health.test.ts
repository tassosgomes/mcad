import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildServer } from '../index.js';
import type { AiOrchestratorConfig } from '../config/env.js';

const baseConfig: AiOrchestratorConfig = {
  host: '127.0.0.1',
  port: 0,
  environment: 'local',
  openAiApiKey: 'test-key',
  openAiModel: 'test-model',
  maxMessageChars: 4000,
  toolTimeoutMs: 1000,
  tracePrompts: false,
  upstreams: {
    cadastroBaseUrl: 'http://localhost:5001/api/v1',
    identificacaoBaseUrl: 'http://localhost:5100/api/v1',
    arrecadacaoBaseUrl: 'http://localhost:5003/api/v1',
    distribuicaoBaseUrl: 'http://localhost:5004/api/v1',
    auditoriaBaseUrl: 'http://localhost:5005/api/v1',
    authzBaseUrl: 'http://localhost:5200/api/authz/v1',
  },
};

test('health endpoints return service status', async () => {
  const server = await buildServer(baseConfig);

  try {
    const liveResponse = await server.inject('/health/live');
    const readyResponse = await server.inject('/health/ready');

    assert.equal(liveResponse.statusCode, 200);
    assert.equal(readyResponse.statusCode, 200);
    assert.deepEqual(liveResponse.json(), {
      status: 'UP',
      service: 'mcad-ai-orchestrator',
    });
    assert.deepEqual(readyResponse.json(), {
      status: 'UP',
      checks: {
        openaiConfigured: true,
        storageConfigured: false,
      },
    });
  } finally {
    await server.close();
  }
});

test('ready endpoint reports down when OpenAI key is missing', async () => {
  const server = await buildServer({
    ...baseConfig,
    openAiApiKey: '',
  });

  try {
    const response = await server.inject('/health/ready');

    assert.equal(response.statusCode, 503);
    assert.deepEqual(response.json(), {
      status: 'DOWN',
      checks: {
        openaiConfigured: false,
        storageConfigured: false,
      },
    });
  } finally {
    await server.close();
  }
});

test('chat endpoint validates request payload', async () => {
  const server = await buildServer(baseConfig);

  try {
    const response = await server.inject({
      method: 'POST',
      url: '/v1/chat',
      payload: {
        message: '',
      },
    });

    assert.equal(response.statusCode, 422);
    assert.equal(response.json().title, 'Invalid chat request');
  } finally {
    await server.close();
  }
});
