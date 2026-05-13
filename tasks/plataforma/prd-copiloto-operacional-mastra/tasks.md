# Resumo de Tarefas de Implementacao — Copiloto Operacional com IA e Mastra

## Visao Geral

Este plano transforma o PRD e a Tech Spec do Copiloto Operacional em tarefas executaveis para agentes de codigo. A implementacao cria um novo servico `services/ai-orchestrator` com Mastra, integra o BFF como fronteira do frontend, adiciona tools read-only, workflows operacionais, UI React e controles de seguranca/observabilidade.

## Skills de Stack Consultadas

| Skill | Caminho | Influencia |
|---|---|---|
| `react-architecture` | `/home/tsgomes/.agents/skills/react/react-architecture/SKILL.md` | Estrutura feature-based em `frontend/src/features/copiloto` e public API via `index.ts` |
| `react-code-quality` | `/home/tsgomes/.agents/skills/react/react-code-quality/SKILL.md` | TypeScript strict, sem `any`, componentes funcionais, props tipadas |
| `react-testing` | `/home/tsgomes/.agents/skills/react/react-testing/SKILL.md` | Testes com Vitest/RTL, AAA, queries semanticas e `userEvent` |
| `react-observability` | `/home/tsgomes/.agents/skills/react/react-observability/SKILL.md` | Propagacao de trace, nao logar dados sensiveis e estados de erro |
| `react-production-readiness` | `/home/tsgomes/.agents/skills/react/react-production-readiness/SKILL.md` | Checklist de build/test, seguranca, config runtime e sanitizacao |
| `restful-api` | `/home/tsgomes/.agents/skills/common/restful-api/SKILL.md` | Rotas versionadas, JSON, status HTTP e Problem Details |
| Padroes locais Node/Fastify | `services/bff/src/*.ts` | Estilo TypeScript do BFF, `node:test`, proxy Fastify e headers `x-mcad-*` |

## Fases de Implementacao

### Fase 1 - Fundacao do Servico AI

Cria `ai-orchestrator`, configuracao, health checks, storage basico, cliente HTTP interno e contrato de RuntimeContext.

### Fase 2 - Integracao Segura e Tools

Integra BFF, autentica/autoriza chamadas, implementa tools read-only e agente principal com OpenAI/Mastra.

### Fase 3 - Workflows e UX

Implementa workflows Mastra e a interface React do Copiloto com historico, tool trace e aprovacao de workflow suspenso.

### Fase 4 - Observabilidade, Infra e Validacao

Adiciona redaction, metricas, Docker Compose, documentacao, testes integrados e E2E.

## Tarefas

- [x] 1.0 Criar scaffold do `ai-orchestrator` com Mastra, config e health checks
- [x] 2.0 Integrar BFF ao `ai-orchestrator` via `/api/ai/v1/*`
- [x] 3.0 Implementar RuntimeContext, cliente HTTP interno, autorizacao e redaction
- [x] 4.0 Implementar agente Mastra principal com provedor OpenAI
- [x] 5.0 Implementar tools read-only de Authz e Cadastro
- [x] 6.0 Implementar tools read-only de Arrecadacao, Distribuicao e Auditoria
- [x] 7.0 Implementar workflows Mastra operacionais e suspensao para aprovacao
- [x] 8.0 Implementar UI React do Copiloto
- [x] 9.0 Implementar observabilidade, auditoria tecnica e storage de execucoes
- [x] 10.0 Atualizar infraestrutura, documentacao e validacao E2E

## Rastreabilidade US -> Tasks

| User Story | Tasks Relacionadas | Tipo de Cobertura |
|---|---|---|
| HU-01 Consultar obra por linguagem natural | 4.0, 5.0, 7.0, 8.0 | Direta |
| HU-02 Investigar pagamento | 4.0, 6.0, 8.0 | Direta |
| HU-03 Validar pre-requisitos de distribuicao | 6.0, 7.0, 8.0 | Direta |
| HU-04 Executar fluxo com aprovacao | 7.0, 8.0, 9.0 | Direta |

## Validacao de Cobertura

### Requisitos Funcionais

| Requisito | Task(s) | Status |
|---|---|---|
| RF-01 Chat operacional integrado ao frontend | 2.0, 8.0 | Coberto |
| RF-02 Tools somente leitura no MVP | 5.0, 6.0 | Coberto |
| RF-03 RuntimeContext com identidade e autorizacao | 3.0, 5.0, 6.0 | Coberto |
| RF-04 Workflows operacionais tipados | 7.0 | Coberto |
| RF-05 Confirmacao humana para acoes sensiveis | 7.0, 8.0 | Coberto |
| RF-06 Auditoria e observabilidade | 3.0, 9.0, 10.0 | Coberto |

### Artefatos da TechSpec

| Artefato | Task | Status |
|---|---:|---|
| `services/ai-orchestrator/package.json` | 1.0 | Coberto |
| `services/ai-orchestrator/tsconfig.json` | 1.0 | Coberto |
| `services/ai-orchestrator/Dockerfile` | 10.0 | Coberto |
| `services/ai-orchestrator/src/index.ts` | 1.0 | Coberto |
| `services/ai-orchestrator/src/mastra/index.ts` | 1.0, 4.0, 7.0, 9.0 | Coberto |
| `services/ai-orchestrator/src/mastra/agents/mcad-operational-agent.ts` | 4.0 | Coberto |
| `services/ai-orchestrator/src/mastra/tools/authz-tool.ts` | 5.0 | Coberto |
| `services/ai-orchestrator/src/mastra/tools/cadastro-tools.ts` | 5.0 | Coberto |
| `services/ai-orchestrator/src/mastra/tools/arrecadacao-tools.ts` | 6.0 | Coberto |
| `services/ai-orchestrator/src/mastra/tools/distribuicao-tools.ts` | 6.0 | Coberto |
| `services/ai-orchestrator/src/mastra/tools/auditoria-tools.ts` | 6.0 | Coberto |
| `services/ai-orchestrator/src/mastra/workflows/explicar-obra-workflow.ts` | 7.0 | Coberto |
| `services/ai-orchestrator/src/mastra/workflows/validar-distribuicao-workflow.ts` | 7.0 | Coberto |
| `services/ai-orchestrator/src/mastra/workflows/preparar-acao-sensivel-workflow.ts` | 7.0 | Coberto |
| `services/ai-orchestrator/src/config/env.ts` | 1.0 | Coberto |
| `services/ai-orchestrator/src/http/mcad-client.ts` | 3.0 | Coberto |
| `services/ai-orchestrator/src/http/auth-context.ts` | 3.0 | Coberto |
| `services/ai-orchestrator/src/schemas/chat.ts` | 1.0, 4.0 | Coberto |
| `services/ai-orchestrator/src/schemas/runtime-context.ts` | 3.0 | Coberto |
| `services/ai-orchestrator/src/security/redaction.ts` | 3.0, 9.0 | Coberto |
| `services/ai-orchestrator/src/observability/logger.ts` | 9.0 | Coberto |
| `services/ai-orchestrator/src/__tests__/tools.test.ts` | 5.0, 6.0 | Coberto |
| `services/ai-orchestrator/src/__tests__/workflows.test.ts` | 7.0 | Coberto |
| `services/ai-orchestrator/README.md` | 10.0 | Coberto |
| `frontend/src/features/copiloto/pages/CopilotoPage.tsx` | 8.0 | Coberto |
| `frontend/src/features/copiloto/api/copilotoApi.ts` | 8.0 | Coberto |
| `frontend/src/features/copiloto/components/ChatPanel.tsx` | 8.0 | Coberto |
| `frontend/src/features/copiloto/components/ToolTraceList.tsx` | 8.0 | Coberto |
| `frontend/src/features/copiloto/components/WorkflowApproval.tsx` | 8.0 | Coberto |
| `services/bff/src/config.ts` | 2.0 | Coberto |
| `services/bff/src/server.ts` | 2.0 | Coberto |
| `services/bff/README.md` | 10.0 | Coberto |
| `services/bff/src/server.test.ts` | 2.0 | Coberto |
| `frontend/src/app/router/routes.tsx` | 8.0 | Coberto |
| `frontend/src/app/providers/AppProviders.tsx` | 8.0 | Coberto |
| `frontend/src/shared/components/*` | 8.0 | Coberto |
| `docker-compose.dev.yml` | 10.0 | Coberto |
| `.env.example` | 10.0 | Coberto |
| `README.md` | 10.0 | Coberto |

### Categorias Obrigatorias

| # | Categoria | Task(s) / N/A | Skill Relacionada | Status |
|---|---|---|---|---|
| 1 | Setup / Configuracao | 1.0, 10.0 | Padroes locais Node/Fastify | Coberto |
| 2 | Modelos de Dados | 1.0, 3.0, 9.0 | `react-architecture` para UI; Mastra storage na TechSpec | Coberto |
| 3 | Logica de Negocio | 4.0, 5.0, 6.0, 7.0 | Padroes locais Node/Fastify | Coberto |
| 4 | Endpoints / Interfaces | 1.0, 2.0, 4.0, 7.0 | `restful-api` | Coberto |
| 5 | Integracoes Externas | 4.0, 5.0, 6.0 | OpenAI, APIs MCAD, `ecad-authz` | Coberto |
| 6 | Validacoes e Erros | 3.0, 5.0, 6.0, 7.0 | `react-code-quality`, `restful-api` | Coberto |
| 7 | Testes | Subtarefas em todas as tasks | `react-testing`, `node:test` local | Coberto |
| 8 | Observabilidade | 2.0, 9.0 | `react-observability` | Coberto |
| 9 | Documentacao | 10.0 | — | Coberto |
| 10 | Seguranca | 3.0, 5.0, 6.0, 9.0 | `react-production-readiness` | Coberto |

## Analise de Paralelizacao

### Lanes de Execucao Paralela

| Lane | Tarefas | Descricao |
|---|---|---|
| Lane A - Fundacao backend | 1.0 -> 3.0 -> 4.0 | Caminho critico para runtime Mastra e chat |
| Lane B - BFF | 2.0 | Pode rodar apos 1.0 definir health/endpoints minimos |
| Lane C - Tools | 5.0 e 6.0 | Paralelizaveis depois de 3.0 |
| Lane D - Frontend | 8.0 | Pode iniciar com contrato mockado depois de 2.0/4.0 definirem schemas |
| Lane E - Observabilidade/Infra | 9.0 e 10.0 | Parte pode iniciar cedo, final depende dos endpoints reais |

### Caminho Critico

`1.0 -> 3.0 -> 4.0 -> 5.0 -> 7.0 -> 8.0 -> 10.0`

### Diagrama de Dependencias

```text
1.0
├── 2.0
├── 3.0
│   ├── 4.0
│   │   ├── 5.0
│   │   ├── 6.0
│   │   └── 7.0
│   └── 9.0
├── 8.0
└── 10.0 (validacao final depende de 2.0, 7.0, 8.0, 9.0)
```

## Proximo Passo

Executar as tarefas em ordem, usando `cy-execute-task` para cada arquivo individual quando a implementacao for iniciada.
