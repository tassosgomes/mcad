# Resumo de Tarefas — F02: Gestão de Processos de Distribuição

## Visão Geral

Implementação do ciclo de vida do Processo de Distribuição: consumo de eventos upstream (Rol/Verba), entidade com máquina de estados, Outbox Pattern para publicação de eventos, endpoints REST, e módulo frontend com listagem paginada, detalhes com ações e criação.

> **Revisão 2026-05-15:** introduzidas duas tasks transversais (1.5 Permissionamento, 1.7 Auditoria) refletindo o novo padrão `@RequiresPermission` (ADR 0002/0003) e `AuditClient` (audit-sdk) já consolidados em arrecadacao/identificacao. Tasks 4.0, 5.0 e 6.0 ampliadas para incluir `AuditClient`, `@RequiresPermission` e testes de 401/403/audit.

## Skills de Stack Consultadas

| Skill | Influência |
|-------|------------|
| `java-architecture` | Clean Architecture, CQRS commands+queries, state machine no domain |
| `java-dependency-config` | Spring AMQP, CloudEvents, Flyway, authz-spring-boot-starter, audit-sdk-spring-boot-starter |
| `java-code-quality` | Records, enums, encapsulamento de estado |
| `java-testing` | JUnit 5 + AssertJ + Mockito, Testcontainers (PostgreSQL + RabbitMQ), MockMvc + JwtRequestPostProcessors |
| `java-observability` | Logging por transição de estado, AuditClient (USER_ACTION + DATA_CHANGE) |
| `react-architecture` | Feature module com pages, hooks, api, types; gate de UI por permission (BFF) |

## Fases de Implementação

### Fase 1 — Infraestrutura Backend (Tasks 1.0 a 3.0)
Migration, **permissionamento (authz-sdk + catálogo + migração legacy RubricaController)**, **auditoria (AuditContextProvider + ProcessoAuditEventFactory)**, domain entities, repositórios, Outbox Pattern, event consumers.

### Fase 2 — Lógica de Negócio + API (Tasks 4.0 a 5.0)
Commands com AuditClient, queries, controller com `@RequiresPermission`, exception handler.

### Fase 3 — Testes Backend (Task 6.0)
Unitários, integração com Testcontainers, **AuthzPermissionEnforcementTest**, **ProcessoAuditOutboxIntegrationTest**.

### Fase 4 — Frontend (Tasks 7.0 a 8.0)
API client, hooks, componentes, páginas, roteamento; **gate de ações por permission do BFF**.

## Tarefas

- [x] 1.0 Migration + Domain entities (ProcessoDistribuicao, Snapshots, OutboxEvent) — `audit_outbox` já existe via V4
- [x] 1.5 **Permissionamento:** adicionar `authz-spring-boot-starter` (pom), criar `permissions.yaml` (7 keys da F02 + 2 keys legacy de rubrica) e `docs/authz/catalog/distribuicao.md`, **migrar `RubricaController` de `@PreAuthorize` para `@RequiresPermission`**, configurar bloco `ecad.authz` no application.yml
- [x] 1.7 **Auditoria:** portar `AuditContextProvider` de arrecadacao-application, criar `ProcessoAuditEventFactory` + enum `ProcessoAuditOperation` (CREATE/CALCULATE/APPROVE/FINALIZE/CANCEL) + record `ProcessoAuditChange`, configurar bloco `audit` (mode=OUTBOX_RABBITMQ) no application.yml
- [x] 2.0 Outbox Pattern: writer, publisher, worker (portado de arrecadação) — **apenas para eventos de domínio; auditoria usa relay próprio do starter**
- [x] 3.0 Event consumers: Rol e Verba (listeners + handlers) — **sem auditoria** (consumers de evento, não ações de usuário)
- [x] 4.0 Commands: criar, aprovar, finalizar, cancelar, calcular (stub) — **todos injetam `AuditClient` + `AuditContextProvider` + `ProcessoAuditEventFactory` e publicam `userAction` + `dataChange` na mesma transação**
- [x] 5.0 Queries + Controller + Exception handler — **cada endpoint do ProcessoController com `@RequiresPermission("distribuicao:default:processo:<acao>")`**
- [x] 6.0 Testes backend: unitários e integração + **`AuthzPermissionEnforcementTest` (401/403/200 para cada endpoint, mockando `AuthzDecisionClient`)** + **`ProcessoAuditOutboxIntegrationTest` (verifica registros em `audit_outbox` após cada cenário de fluxo)** + `TestSecurityConfig`
- [x] 7.0 Frontend: tipos, API client, hooks
- [x] 8.0 Frontend: componentes, páginas, roteamento — **`ProcessoActions` esconde botões conforme permissions do usuário (BFF, ADR 0004); item de sidebar escondido se sem `distribuicao:default:processo:listar`**

## Rastreabilidade US → Tasks

| User Story | Tasks Relacionadas | Tipo de Cobertura |
|------------|--------------------|-------------------|
| HU-01 — Receber snapshots Rol/Verba | 1.0, 3.0 | Direta |
| HU-02 — Criar processo | 1.0, 4.0, 5.0, 8.0 | Direta |
| HU-03 — Listar e filtrar processos | 5.0, 7.0, 8.0 | Direta |
| HU-04 — Visualizar detalhes | 5.0, 7.0, 8.0 | Direta |
| HU-05 — Aprovar processo | 4.0, 5.0, 8.0 | Direta |
| HU-06 — Finalizar processo | 4.0, 5.0, 8.0 | Direta |
| HU-07 — Cancelar processo | 4.0, 5.0, 8.0 | Direta |

## Validação de Cobertura

### Requisitos Funcionais

| Requisito | Task(s) | Status |
|-----------|---------|--------|
| RF-01 — Consumir `identificacao.rol.fechado` | 3.0 | ✅ |
| RF-02 — Consumir `identificacao.rol.cancelado` | 3.0 | ✅ |
| RF-03 — Consumir `arrecadacao.verba.disponivel` | 3.0 | ✅ |
| RF-04 — Idempotência no consumo | 3.0 | ✅ |
| RF-05 — Criar processo (rubrica+período) | 4.0 | ✅ |
| RF-06 — Validar Rol fechado | 4.0 | ✅ |
| RF-07 — Validar Verba disponível | 4.0 | ✅ |
| RF-08 — Impedir duplicata | 4.0 | ✅ |
| RF-09 — Status CRIADO + dados | 4.0 | ✅ |
| RF-10 — Evento `processo.criado` | 4.0, 2.0 | ✅ |
| RF-11 — Tela listagem | 8.0 | ✅ |
| RF-12 — Filtros listagem | 8.0, 5.0 | ✅ |
| RF-13 — Paginação | 8.0, 5.0 | ✅ |
| RF-14 — Tela detalhes | 8.0 | ✅ |
| RF-15 — Botões por estado | 8.0 | ✅ |
| RF-16 — CRIADO → CALCULADO | 4.0 | ✅ |
| RF-17 — CALCULADO → APROVADO | 4.0 | ✅ |
| RF-18 — APROVADO → FINALIZADO (confirmação) | 4.0, 8.0 | ✅ |
| RF-19 — Eventos finalizar + rol.processado | 4.0, 2.0 | ✅ |
| RF-20 — Cancelamento + justificativa | 4.0, 8.0 | ✅ |
| RF-21 — Evento `processo.cancelado` | 4.0, 2.0 | ✅ |
| RF-22 — Transições inválidas rejeitadas | 1.0, 4.0 | ✅ |
| RF-23 — Data + analista em transições | 1.0 | ✅ |
| RF-24 — Evento `processo.aprovado` | 4.0, 2.0 | ✅ |
| RF-25 — Disponibilidades na criação | 5.0, 8.0 | ✅ |
| RF-26 — Dados nas disponibilidades | 5.0 | ✅ |
| RF-AUTHZ-01 — Endpoints com `@RequiresPermission` (4 segmentos) | 1.5, 5.0 | ✅ |
| RF-AUTHZ-02 — `permissions.yaml` + catálogo MD | 1.5 | ✅ |
| RF-AUTHZ-03 — Migração legacy do `RubricaController` | 1.5 | ✅ |
| RF-AUTHZ-04 — Testes 401/403/200 mockando `AuthzDecisionClient` | 6.0 | ✅ |
| RF-AUD-01 — `userAction` + `dataChange` por operação | 1.7, 4.0 | ✅ |
| RF-AUD-02 — Falha em audit não bloqueia comando | 1.7 (audit-sdk default) | ✅ |
| RF-AUD-03 — Testes de integração verificam `audit_outbox` | 6.0 | ✅ |
| RF-AUD-04 — `actionCode` derivado da `ProcessoAuditOperation` | 1.7 | ✅ |

### Categorias Obrigatórias

| # | Categoria | Task(s) / N/A | Status |
|---|-----------|---------------|--------|
| 1 | Setup / Configuração | 1.0 (migration), 1.5 (authz-sdk + yaml), 1.7 (audit config), 2.0 (outbox config), 3.0 (RabbitMQ queues) | ✅ |
| 2 | Modelos de Dados | 1.0 | ✅ |
| 3 | Lógica de Negócio | 4.0 (commands com auditoria), 1.0 (estado na entidade) | ✅ |
| 4 | Endpoints / Interfaces | 5.0 (com `@RequiresPermission`) | ✅ |
| 5 | Integrações Externas | 2.0 (Outbox de domínio → RabbitMQ), 3.0 (RabbitMQ → snapshots), 1.5 (ecad-authz), 1.7 (relay audit → RabbitMQ) | ✅ |
| 6 | Validações e Erros | 4.0, 5.0 (exception handler) | ✅ |
| 7 | Testes | 6.0 (unitários + integração + authz + audit) | ✅ |
| 8 | Observabilidade | 4.0 (logs + auditoria USER_ACTION/DATA_CHANGE) | ✅ |
| 9 | Documentação | 1.5 (`docs/authz/catalog/distribuicao.md`) | ✅ |
| 10 | Segurança | 1.5 (permissionamento), 5.0 (`@RequiresPermission` no controller), 8.0 (gate de UI por permission BFF) | ✅ |

## Análise de Paralelização

### Lanes de Execução Paralela

| Lane | Tarefas | Descrição |
|------|---------|-----------|
| Lane A (Backend core) | 1.0 → 2.0 → 3.0 → 4.0 → 5.0 → 6.0 | Caminho crítico |
| Lane B (Permissionamento) | 1.5 | **Independente** — apenas pom + yaml + doc + RubricaController. Pode rodar em paralelo com 1.0/2.0/3.0 |
| Lane C (Auditoria) | 1.7 | **Independente** — apenas application/audit/* + bloco de config. Pode rodar em paralelo com 1.0/2.0/3.0 |
| Lane D (Frontend) | 7.0 → 8.0 | Paralelo com backend (usa mock server) |

### Caminho Crítico

```
1.0 → 2.0 → 4.0 → 5.0 → 6.0
```

### Diagrama de Dependências

```
1.0 Migration + Domain
 ├──→ 2.0 Outbox Pattern (domínio)
 │     └──→ 4.0 Commands (usa OutboxEventWriter + AuditClient)
 │           └──→ 5.0 Queries + Controller (com @RequiresPermission)
 │                 └──→ 6.0 Testes Backend (inclui authz + audit)
 └──→ 3.0 Event Consumers (paralelo com 2.0)
       └──→ 4.0 (também depende de snapshots)

1.5 Permissionamento (authz-sdk + yaml + RubricaController)
 └──→ 5.0 (controller usa @RequiresPermission)
 └──→ 6.0 (AuthzPermissionEnforcementTest)

1.7 Auditoria (AuditContextProvider + ProcessoAuditEventFactory)
 └──→ 4.0 (handlers injetam AuditClient + factory)
 └──→ 6.0 (ProcessoAuditOutboxIntegrationTest)

7.0 Frontend: tipos + hooks (paralelo, usa mock)
 └──→ 8.0 Frontend: componentes + páginas (gate por permission)
```

### Recomendação de Paralelização para Subagents

| Subagent | Tasks | Por quê |
|---|---|---|
| Agent 1 — Backbone | 1.0 → 2.0 → 3.0 | Caminho crítico, mesma camada infra; um agent só evita conflitos de compile incremental |
| Agent 2 — Cross-cutting | 1.5 + 1.7 | Ambas mexem em config + arquivos novos; pequenas, mas devem ser concluídas antes da 4.0/5.0 |
| Agent 3 — Aplicação + API | 4.0 → 5.0 | Depende de 1.0, 1.5, 1.7, 2.0; rodar depois que os outros 2 agents terminarem |
| Agent 4 — Testes | 6.0 | Depende de 4.0+5.0; pode rodar em sequência ou no mesmo agent da Aplicação |
| Agent 5 — Frontend | 7.0 → 8.0 | Independente do backend (mock); pode rodar do início ao fim em paralelo com tudo |
