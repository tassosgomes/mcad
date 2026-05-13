---
status: completed
parallelizable: false
blocked_by: []
---

<task_context>
<domain>plataforma/ai-orchestrator</domain>
<type>implementation</type>
<scope>configuration</scope>
<complexity>medium</complexity>
<dependencies>http_server,external_apis,database</dependencies>
<unblocks>2.0, 3.0, 4.0, 10.0</unblocks>
</task_context>

# Tarefa 1.0: Criar scaffold do `ai-orchestrator` com Mastra, config e health checks

## Relacionada as User Stories

- HU-01 Consultar obra por linguagem natural (suporte)
- HU-02 Investigar pagamento (suporte)
- HU-03 Validar pre-requisitos de distribuicao (suporte)
- HU-04 Executar fluxo com aprovacao (suporte)

## Visao Geral

Criar o novo servico Node.js/TypeScript `services/ai-orchestrator` com Mastra, configuracao de ambiente, servidor HTTP, health checks e estrutura inicial de pastas definida na Tech Spec.

## Requisitos

- Criar um servico separado do BFF.
- Configurar TypeScript em modo strict.
- Expor `GET /health/live`, `GET /health/ready`, `POST /v1/chat`, `POST /v1/workflows/:workflowId/runs` e `POST /v1/workflows/:workflowId/runs/:runId/resume` como stubs iniciais.
- Centralizar variaveis em `src/config/env.ts`.
- Preparar registro Mastra em `src/mastra/index.ts`.

## Arquivos Envolvidos

- **Criar:**
  - `services/ai-orchestrator/package.json`
  - `services/ai-orchestrator/package-lock.json`
  - `services/ai-orchestrator/tsconfig.json`
  - `services/ai-orchestrator/src/index.ts`
  - `services/ai-orchestrator/src/config/env.ts`
  - `services/ai-orchestrator/src/mastra/index.ts`
  - `services/ai-orchestrator/src/schemas/chat.ts`
  - `services/ai-orchestrator/src/__tests__/health.test.ts`
- **Modificar:**
  - Nenhum nesta tarefa.
- **Referencia:**
  - `services/bff/package.json` (scripts Node/TS atuais)
  - `services/bff/src/server.ts` (estilo Fastify e health checks)
  - `tasks/plataforma/prd-copiloto-operacional-mastra/techspec.md`
- **Skills para consultar durante implementacao:**
  - `restful-api` — status HTTP, JSON e versionamento
  - Padroes locais Node/Fastify — estrutura de scripts e `node:test`

## Subtarefas

- [x] 1.1 Criar `package.json` com scripts `dev`, `build`, `start`, `test`.
- [x] 1.2 Instalar dependencias Mastra/OpenAI/Zod/Fastify ou stack HTTP indicada pela versao atual da Mastra.
- [x] 1.3 Configurar `tsconfig.json` com `strict: true`, ES modules e saida `dist`.
- [x] 1.4 Criar `env.ts` validando `AI_PORT`, `AI_HOST`, `OPENAI_API_KEY`, `OPENAI_MODEL`, URLs de upstream e storage.
- [x] 1.5 Criar health checks e stubs dos endpoints de chat/workflow.
- [x] 1.6 Criar `src/mastra/index.ts` registrando estrutura vazia de agents/tools/workflows.
- [x] 1.7 Adicionar testes de health check e validacao de env.

## Sequenciamento

- Bloqueado por: Nenhum
- Desbloqueia: 2.0, 3.0, 4.0, 10.0
- Paralelizavel: Nao (define base compartilhada do servico)

## Rastreabilidade

- Esta tarefa cobre: suporte para RF-01, RF-04, RF-06.
- Evidencia esperada: endpoints de health respondem e o projeto compila.

## Detalhes de Implementacao

Endpoints iniciais do `ai-orchestrator`:

```text
GET  /health/live
GET  /health/ready
POST /v1/chat
POST /v1/workflows/:workflowId/runs
POST /v1/workflows/:workflowId/runs/:runId/resume
```

O endpoint `/v1/chat` pode retornar `501 Not Implemented` ate a tarefa 4.0, desde que o contrato e o roteamento existam.

**Convencoes da stack (das skills consultadas):**
- Usar TypeScript strict e evitar `any`.
- Usar JSON em todas as respostas.
- Retornar erros em formato consistente com Problem Details quando aplicavel.
- Seguir o estilo ESM e `node:test` ja usado no BFF.

## Criterios de Sucesso (Verificaveis)

- [x] Build compila sem erros: `cd services/ai-orchestrator && npm run build`
- [x] Testes passam: `cd services/ai-orchestrator && npm test`
- [x] `GET /health/live` retorna `200` com `{ "status": "UP" }`
- [x] `GET /health/ready` retorna `200` ou `503` sem expor segredos
- [x] Nenhum valor de `OPENAI_API_KEY` aparece em logs, respostas ou testes
