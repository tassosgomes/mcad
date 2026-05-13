import assert from 'node:assert/strict';
import { after, test } from 'node:test';
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

function authHeaders(permissions: string) {
  return {
    authorization: 'Bearer local-token',
    'x-mcad-user-id': 'user-1',
    'x-mcad-permissions': permissions,
  };
}

test('prepararAcaoSensivelWorkflow suspends without executing writes', async () => {
  const server = await buildServer(config);

  try {
    const response = await server.inject({
      method: 'POST',
      url: '/v1/workflows/prepararAcaoSensivelWorkflow/runs',
      headers: authHeaders('*'),
      payload: {
        input: {
          intencao: 'bloquear obra',
          entidadeTipo: 'Obra',
          entidadeId: 'obra-1',
        },
      },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().status, 'suspended');
    assert.equal(response.json().output.escritaExecutada, false);
    assert.equal(response.json().suspendedWorkflow.stepId, 'aguardar-aprovacao-humana');
  } finally {
    await server.close();
  }
});

test('validarDistribuicaoWorkflow returns typed checklist', async () => {
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        items: [
          {
            id: 'item-1',
            descricao: 'registro operacional',
            status: 'OK',
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
  const server = await buildServer(config);

  try {
    const response = await server.inject({
      method: 'POST',
      url: '/v1/workflows/validarDistribuicaoWorkflow/runs',
      headers: authHeaders('arrecadacao.pagamentos.read,distribuicao.processos.read'),
      payload: {
        input: {
          rubricaSigla: 'RADIO',
          periodo: '2026-05',
        },
      },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().status, 'success');
    assert.equal(response.json().output.apto, true);
    assert.deepEqual(response.json().output.bloqueios, []);
    assert.equal(response.json().output.fontes.length, 2);
  } finally {
    await server.close();
  }
});

test('workflow resume records approval without executing writes', async () => {
  const server = await buildServer(config);

  try {
    const response = await server.inject({
      method: 'POST',
      url: '/v1/workflows/prepararAcaoSensivelWorkflow/runs/run-1/resume',
      headers: authHeaders('*'),
      payload: {
        resumeData: {
          aprovado: true,
        },
      },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().status, 'success');
    assert.equal(response.json().output.aprovado, true);
    assert.equal(response.json().output.escritaExecutada, false);
  } finally {
    await server.close();
  }
});
