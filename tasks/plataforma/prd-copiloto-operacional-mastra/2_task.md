---
status: completed
parallelizable: true
blocked_by: [1.0]
---

<task_context>
<domain>plataforma/bff</domain>
<type>integration</type>
<scope>middleware</scope>
<complexity>low</complexity>
<dependencies>http_server</dependencies>
<unblocks>8.0, 10.0</unblocks>
</task_context>

# Tarefa 2.0: Integrar BFF ao `ai-orchestrator` via `/api/ai/v1/*`

## Relacionada as User Stories

- HU-01 Consultar obra por linguagem natural (suporte)
- HU-02 Investigar pagamento (suporte)
- HU-03 Validar pre-requisitos de distribuicao (suporte)
- HU-04 Executar fluxo com aprovacao (suporte)

## Visao Geral

Adicionar o `ai-orchestrator` como upstream do BFF, preservando o frontend como consumidor exclusivo de `/api/ai/v1/*`.

## Requisitos

- Adicionar `AI_ORCHESTRATOR_BASE_URL` em `BffConfig`.
- Registrar upstream `ai` com prefixo `/api/ai/v1` apontando para `/v1` do `ai-orchestrator`.
- Propagar `authorization`, `x-mcad-request-id`, `x-mcad-original-url` e `x-mcad-bff-upstream`.
- Cobrir roteamento com testes do BFF.

## Arquivos Envolvidos

- **Criar:**
  - Nenhum.
- **Modificar:**
  - `services/bff/src/config.ts` (adicionar upstream AI)
  - `services/bff/src/server.ts` (registrar rotas se o loop atual nao bastar)
  - `services/bff/src/server.test.ts` (testar proxy AI)
- **Referencia:**
  - `services/bff/src/proxy.ts` (padrão de rewrite e headers)
  - `services/bff/README.md` (sera atualizado na task 10.0)
- **Skills para consultar durante implementacao:**
  - `restful-api` — versionamento e codigos HTTP
  - Padroes locais Node/Fastify — testes com `node:test`

## Subtarefas

- [x] 2.1 Adicionar env `AI_ORCHESTRATOR_BASE_URL`, default `http://localhost:5300/v1`.
- [x] 2.2 Adicionar upstream `{ name: 'ai', prefix: '/api/ai/v1', baseUrl: AI_ORCHESTRATOR_BASE_URL }`.
- [x] 2.3 Garantir que CORS permita `authorization,content-type` para chamadas de chat/workflow.
- [x] 2.4 Criar teste que envia `POST /api/ai/v1/chat` e verifica rewrite para `/v1/chat`.
- [x] 2.5 Criar teste de propagacao de `authorization` e headers `x-mcad-*`.

## Sequenciamento

- Bloqueado por: 1.0
- Desbloqueia: 8.0, 10.0
- Paralelizavel: Sim, apos endpoint minimo do `ai-orchestrator`

## Rastreabilidade

- Esta tarefa cobre: RF-01 e suporte a RF-06.
- Evidencia esperada: BFF roteia chamadas AI sem alterar padrao existente de proxy.

## Detalhes de Implementacao

Config esperada:

```ts
{
  name: 'ai',
  prefix: '/api/ai/v1',
  baseUrl: getEnv('AI_ORCHESTRATOR_BASE_URL', 'http://localhost:5300/v1'),
}
```

**Convencoes da stack (das skills consultadas):**
- URLs versionadas no path.
- Nao criar excecao especial se o helper `registerProxy` atender ao caso.
- Testar comportamento publico por `server.inject`.

## Criterios de Sucesso (Verificaveis)

- [x] Testes BFF passam: `cd services/bff && npm run build && npm test`
- [x] `POST /api/ai/v1/chat` e encaminhado para `/v1/chat`
- [x] Header `authorization` chega ao upstream de teste
- [x] Resposta do BFF inclui `x-mcad-bff-upstream: ai`
