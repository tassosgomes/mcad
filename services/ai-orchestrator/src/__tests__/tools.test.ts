import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import type { RuntimeContext } from '@mastra/core/runtime-context';
import type { AiOrchestratorConfig } from '../config/env.js';
import { ForbiddenError } from '../http/errors.js';
import { createRuntimeContext } from '../schemas/runtime-context.js';
import { consultarPermissoesUsuario } from '../mastra/tools/authz-tool.js';
import { createCadastroTools } from '../mastra/tools/cadastro-tools.js';

interface ExecutableTool<TInput, TOutput> {
  execute(context: { context: TInput; runtimeContext: RuntimeContext }, options?: { abortSignal?: AbortSignal }): Promise<TOutput>;
}

interface LookupResult {
  items: Array<{ id: string; label: string; status?: string }>;
  source: { toolId: string; status: string };
}

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
    cadastroBaseUrl: 'http://cadastro.local/api/v1',
    identificacaoBaseUrl: 'http://identificacao.local/api/v1',
    arrecadacaoBaseUrl: 'http://arrecadacao.local/api/v1',
    distribuicaoBaseUrl: 'http://distribuicao.local/api/v1',
    auditoriaBaseUrl: 'http://auditoria.local/api/v1',
    authzBaseUrl: 'http://authz.local/v1',
  },
};

const originalFetch = globalThis.fetch;

after(() => {
  globalThis.fetch = originalFetch;
});

function runtimeContext(permissions: string[]) {
  return createRuntimeContext({
    userId: 'user-1',
    permissions,
    authzVersion: 42,
    accessToken: 'local-token',
    requestId: 'request-1',
    locale: 'pt-BR',
    environment: 'local',
  });
}

test('consultarPermissoesUsuario returns permissions from runtime context', async () => {
  const tool = consultarPermissoesUsuario as ExecutableTool<Record<string, never>, {
    userId: string;
    permissions: string[];
    authzVersion: number;
  }>;

  const result = await tool.execute({
    context: {},
    runtimeContext: runtimeContext(['authz.permissions.read']),
  });

  assert.equal(result.userId, 'user-1');
  assert.deepEqual(result.permissions, ['authz.permissions.read']);
  assert.equal(result.authzVersion, 42);
});

test('buscarObra validates permission before calling cadastro API', async () => {
  const { buscarObra } = createCadastroTools({ config });
  const tool = buscarObra as ExecutableTool<{ termo: string }, LookupResult>;

  await assert.rejects(
    () =>
      tool.execute({
        context: { termo: 'Aquarela' },
        runtimeContext: runtimeContext([]),
      }),
    ForbiddenError,
  );
});

test('buscarObra maps cadastro API payload to lookup result', async () => {
  const { buscarObra } = createCadastroTools({ config });
  const tool = buscarObra as ExecutableTool<{ termo: string }, LookupResult>;
  let requestedUrl = '';
  let authorization = '';

  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input);
    authorization = init?.headers instanceof Headers
      ? init.headers.get('authorization') ?? ''
      : (init?.headers as Record<string, string>).authorization;

    return new Response(
      JSON.stringify({
        items: [
          {
            id: 'obra-1',
            titulo: 'Aquarela',
            status: 'LIBERADO',
          },
        ],
      }),
      {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      },
    );
  };

  const result = await tool.execute({
    context: { termo: 'Aquarela' },
    runtimeContext: runtimeContext(['cadastro.obras.read']),
  });

  assert.equal(requestedUrl, 'http://cadastro.local/api/v1/obras?q=Aquarela');
  assert.equal(authorization, 'Bearer local-token');
  assert.deepEqual(result.items[0], {
    id: 'obra-1',
    label: 'Aquarela',
    status: 'LIBERADO',
    metadata: {
      id: 'obra-1',
      titulo: 'Aquarela',
      status: 'LIBERADO',
    },
  });
  assert.deepEqual(result.source, {
    toolId: 'buscarObra',
    status: 'success',
  });
});
