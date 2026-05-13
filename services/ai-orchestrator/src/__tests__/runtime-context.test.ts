import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildRuntimeContextFromRequest, assertPermission } from '../http/auth-context.js';
import { ForbiddenError, UnauthorizedError } from '../http/errors.js';
import { runtimeContextToObject } from '../schemas/runtime-context.js';
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
  upstreams: {
    cadastroBaseUrl: 'http://localhost:5001/api/v1',
    identificacaoBaseUrl: 'http://localhost:5100/api/v1',
    arrecadacaoBaseUrl: 'http://localhost:5003/api/v1',
    distribuicaoBaseUrl: 'http://localhost:5004/api/v1',
    auditoriaBaseUrl: 'http://localhost:5005/api/v1',
    authzBaseUrl: 'http://localhost:5200/api/authz/v1',
  },
};

test('buildRuntimeContextFromRequest extracts token, roles, permissions and request id', () => {
  const runtimeContext = buildRuntimeContextFromRequest(
    {
      id: 'request-1',
      headers: {
        authorization: 'Bearer local-token',
        'x-mcad-user-id': 'user-1',
        'x-mcad-roles': 'analista-cadastro, consultor',
        'x-mcad-permissions': 'cadastro.obras.read,cadastro.titulares.read',
      },
    } as never,
    config,
  );

  assert.deepEqual(runtimeContextToObject(runtimeContext), {
    userId: 'user-1',
    roles: ['analista-cadastro', 'consultor'],
    permissions: ['cadastro.obras.read', 'cadastro.titulares.read'],
    accessToken: 'local-token',
    requestId: 'request-1',
    locale: 'pt-BR',
    environment: 'local',
  });
});

test('buildRuntimeContextFromRequest rejects missing bearer token', () => {
  assert.throws(
    () =>
      buildRuntimeContextFromRequest(
        {
          id: 'request-1',
          headers: {},
        } as never,
        config,
      ),
    UnauthorizedError,
  );
});

test('assertPermission rejects missing permission', () => {
  const runtimeContext = buildRuntimeContextFromRequest(
    {
      id: 'request-1',
      headers: {
        authorization: 'Bearer local-token',
        'x-mcad-permissions': 'cadastro.obras.read',
      },
    } as never,
    config,
  );

  assert.throws(() => assertPermission(runtimeContext, 'cadastro.titulares.read'), ForbiddenError);
});
