import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { after, test } from 'node:test';
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

const originalFetch = globalThis.fetch;

after(() => {
  globalThis.fetch = originalFetch;
});

function unsignedJwt(payload: Record<string, unknown>): string {
  return [
    Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url'),
    Buffer.from(JSON.stringify(payload)).toString('base64url'),
    'signature',
  ].join('.');
}

function signRuntimeHeaders(values: {
  requestId?: string;
  userId: string;
  displayName?: string;
  permissions: string[];
  authzVersion: number;
  timestamp?: number;
}) {
  const timestamp = values.timestamp ?? Date.now();
  const signature = createHmac('sha256', config.runtimeAuthSecret ?? '')
    .update(JSON.stringify({
      requestId: values.requestId ?? 'request-1',
      userId: values.userId,
      displayName: values.displayName ?? '',
      permissions: values.permissions,
      authzVersion: values.authzVersion,
      timestamp,
    }))
    .digest('base64url');

  return {
    'x-mcad-runtime-auth-timestamp': String(timestamp),
    'x-mcad-runtime-auth-signature': signature,
  };
}

test('buildRuntimeContextFromRequest extracts resolved authorization and request id', async () => {
  const runtimeContext = await buildRuntimeContextFromRequest(
    {
      id: 'request-1',
      headers: {
        authorization: 'Bearer local-token',
        'x-mcad-bff-upstream': 'ai',
        'x-mcad-user-id': 'user-1',
        'x-mcad-user-name': 'Maria Cadastro',
        'x-mcad-permissions': 'cadastro.obras.read,cadastro.titulares.read',
        'x-mcad-authz-version': '42',
        ...signRuntimeHeaders({
          userId: 'user-1',
          displayName: 'Maria Cadastro',
          permissions: ['cadastro.obras.read', 'cadastro.titulares.read'],
          authzVersion: 42,
        }),
      },
    } as never,
    config,
  );

  assert.deepEqual(runtimeContextToObject(runtimeContext), {
    userId: 'user-1',
    displayName: 'Maria Cadastro',
    permissions: ['cadastro.obras.read', 'cadastro.titulares.read'],
    authzVersion: 42,
    accessToken: 'local-token',
    requestId: 'request-1',
    locale: 'pt-BR',
    environment: 'local',
  });
});

test('buildRuntimeContextFromRequest rejects missing bearer token', async () => {
  await assert.rejects(
    async () =>
      await buildRuntimeContextFromRequest(
        {
          id: 'request-1',
          headers: {},
        } as never,
        config,
      ),
    UnauthorizedError,
  );
});

test('buildRuntimeContextFromRequest rejects forged resolved headers without signature', async () => {
  await assert.rejects(
    async () =>
      await buildRuntimeContextFromRequest(
        {
          id: 'request-1',
          headers: {
            authorization: 'Bearer local-token',
            'x-mcad-bff-upstream': 'ai',
            'x-mcad-user-id': 'user-1',
            'x-mcad-permissions': 'cadastro.titulares.read',
            'x-mcad-authz-version': '42',
          },
        } as never,
        config,
      ),
    ForbiddenError,
  );
});

test('buildRuntimeContextFromRequest fetches authz context when resolved headers are absent', async () => {
  let requestedUrl = '';
  let authorization = '';

  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input);
    authorization = init?.headers instanceof Headers
      ? init.headers.get('authorization') ?? ''
      : (init?.headers as Record<string, string>).authorization;

    return new Response(
      JSON.stringify({
        user: {
          id: 'user-1',
          subject: 'sub-1',
          name: 'Maria Cadastro',
        },
        permissions: ['cadastro.obras.read'],
        version: 43,
      }),
      {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      },
    );
  };

  const runtimeContext = await buildRuntimeContextFromRequest(
    {
      id: 'request-1',
      headers: {
        authorization: 'Bearer local-token',
      },
    } as never,
    config,
  );

  assert.equal(requestedUrl, 'http://localhost:5200/api/authz/v1/me/authorization-context');
  assert.equal(authorization, 'Bearer local-token');
  assert.deepEqual(runtimeContextToObject(runtimeContext), {
    userId: 'user-1',
    displayName: 'Maria Cadastro',
    permissions: ['cadastro.obras.read'],
    authzVersion: 43,
    accessToken: 'local-token',
    requestId: 'request-1',
    locale: 'pt-BR',
    environment: 'local',
  });
});

test('assertPermission rejects missing permission', async () => {
  const runtimeContext = await buildRuntimeContextFromRequest(
    {
      id: 'request-1',
      headers: {
        authorization: 'Bearer local-token',
        'x-mcad-bff-upstream': 'ai',
        'x-mcad-user-id': 'user-1',
        'x-mcad-permissions': 'cadastro.obras.read',
        'x-mcad-authz-version': '42',
        ...signRuntimeHeaders({
          userId: 'user-1',
          permissions: ['cadastro.obras.read'],
          authzVersion: 42,
        }),
      },
    } as never,
    config,
  );

  assert.throws(() => assertPermission(runtimeContext, 'cadastro.titulares.read'), ForbiddenError);
});

test('assertPermission grants explicit effective permission', async () => {
  const runtimeContext = await buildRuntimeContextFromRequest(
    {
      id: 'request-1',
      headers: {
        authorization: 'Bearer local-token',
        'x-mcad-bff-upstream': 'ai',
        'x-mcad-user-id': 'user-1',
        'x-mcad-permissions': 'cadastro.titulares.read',
        'x-mcad-authz-version': '42',
        ...signRuntimeHeaders({
          userId: 'user-1',
          permissions: ['cadastro.titulares.read'],
          authzVersion: 42,
        }),
      },
    } as never,
    config,
  );

  assert.doesNotThrow(() => assertPermission(runtimeContext, 'cadastro.titulares.read'));
});

test('assertPermission ignores admin role from JWT when effective permission is missing', async () => {
  const runtimeContext = await buildRuntimeContextFromRequest(
    {
      id: 'request-1',
      headers: {
        authorization: `Bearer ${unsignedJwt({ sub: 'user-1', roles: ['admin', 'super-admin'] })}`,
        'x-mcad-bff-upstream': 'ai',
        'x-mcad-authz-version': '42',
        ...signRuntimeHeaders({
          userId: 'user-1',
          permissions: [],
          authzVersion: 42,
        }),
      },
    } as never,
    config,
  );

  assert.deepEqual(runtimeContextToObject(runtimeContext).permissions, []);
  assert.throws(() => assertPermission(runtimeContext, 'cadastro.titulares.read'), ForbiddenError);
});

test('assertPermission ignores write scope from JWT when effective permission is missing', async () => {
  const runtimeContext = await buildRuntimeContextFromRequest(
    {
      id: 'request-1',
      headers: {
        authorization: `Bearer ${unsignedJwt({ sub: 'user-1', scope: 'openid profile write' })}`,
        'x-mcad-bff-upstream': 'ai',
        'x-mcad-authz-version': '42',
        ...signRuntimeHeaders({
          userId: 'user-1',
          permissions: [],
          authzVersion: 42,
        }),
      },
    } as never,
    config,
  );

  assert.deepEqual(runtimeContextToObject(runtimeContext).permissions, []);
  assert.throws(() => assertPermission(runtimeContext, 'cadastro.titulares.read'), ForbiddenError);
});
