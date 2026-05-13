---
status: completed
parallelizable: true
blocked_by: [3.0, 7.0]
---

<task_context>
<domain>plataforma/ai-orchestrator/observability</domain>
<type>implementation</type>
<scope>performance</scope>
<complexity>medium</complexity>
<dependencies>database,http_server</dependencies>
<unblocks>10.0</unblocks>
</task_context>

# Tarefa 9.0: Implementar observabilidade, auditoria tecnica e storage de execucoes

## Relacionada as User Stories

- HU-04 Executar fluxo com aprovacao (suporte)

## Visao Geral

Adicionar logger estruturado, metricas, redaction em logs/traces, storage Mastra para memoria/snapshots e auditoria tecnica das chamadas a tools/workflows.

## Requisitos

- Registrar metricas definidas na Tech Spec.
- Correlacionar logs com `x-mcad-request-id`.
- Persistir ou preparar storage de threads/workflows conforme Mastra.
- Redigir logs com dados sanitizados.
- Registrar tool calls com parametros sanitizados, permissao avaliada, latencia e status.

## Arquivos Envolvidos

- **Criar:**
  - `services/ai-orchestrator/src/observability/logger.ts`
  - `services/ai-orchestrator/src/observability/metrics.ts`
  - `services/ai-orchestrator/src/observability/audit-log.ts`
  - `services/ai-orchestrator/src/__tests__/observability.test.ts`
- **Modificar:**
  - `services/ai-orchestrator/src/mastra/index.ts` (storage e observability)
  - `services/ai-orchestrator/src/security/redaction.ts` (integrar com logger)
  - `services/ai-orchestrator/src/config/env.ts` (storage e retencao)
  - `services/ai-orchestrator/src/index.ts` (request logging e metrics endpoint se adotado)
- **Referencia:**
  - `tasks/plataforma/prd-copiloto-operacional-mastra/techspec.md`
  - Documentacao Mastra Storage e Observability
  - `docs/events.md` (correlacao futura com eventos)
- **Skills para consultar durante implementacao:**
  - `react-observability` — principios de trace context e dados sensiveis
  - `react-production-readiness` — checklist de seguranca e logs

## Subtarefas

- [x] 9.1 Implementar logger estruturado com redaction aplicada por padrao.
- [x] 9.2 Instrumentar metricas: `ai.chat.requests.total`, `ai.chat.latency.ms`, `ai.tool.calls.total`, `ai.workflow.runs.total`, `ai.authz.denied.total`.
- [x] 9.3 Configurar storage Mastra para dev e ambiente compartilhado.
- [x] 9.4 Implementar auditoria tecnica para tool/workflow calls com parametros sanitizados.
- [x] 9.5 Garantir que prompts/respostas sensiveis sejam sanitizados ou desabilitados conforme env.
- [x] 9.6 Testar que logs/traces nao contem token, CPF/CNPJ ou e-mail completo.

## Sequenciamento

- Bloqueado por: 3.0, 7.0
- Desbloqueia: 10.0
- Paralelizavel: Sim, apos contratos de workflow existirem

## Rastreabilidade

- Esta tarefa cobre: RF-06.
- Evidencia esperada: execucoes sao rastreaveis sem vazamento de dados sensiveis.

## Detalhes de Implementacao

Metricas minimas:

```text
ai.chat.requests.total
ai.chat.latency.ms
ai.tool.calls.total
ai.workflow.runs.total
ai.authz.denied.total
```

**Convencoes da stack (das skills consultadas):**
- Telemetria nao deve incluir dados pessoais em atributos.
- Trace/request ID deve ser propagado e visivel em logs.
- Configurar storage explicitamente; nao depender de memoria em ambiente compartilhado.

## Criterios de Sucesso (Verificaveis)

- [x] Testes passam: `cd services/ai-orchestrator && npm test -- --test-name-pattern observability`
- [x] Build compila sem erros: `cd services/ai-orchestrator && npm run build`
- [x] Uma chamada de chat registra request ID e latencia
- [x] Tool negada incrementa `ai.authz.denied.total`
- [x] Teste confirma ausencia de token/CPF/CNPJ/e-mail completo em logs
