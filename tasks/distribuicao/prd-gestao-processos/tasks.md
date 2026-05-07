# Resumo de Tarefas — F02: Gestão de Processos de Distribuição

## Visão Geral

Implementação do ciclo de vida do Processo de Distribuição: consumo de eventos upstream (Rol/Verba), entidade com máquina de estados, Outbox Pattern para publicação de eventos, endpoints REST, e módulo frontend com listagem paginada, detalhes com ações e criação.

## Skills de Stack Consultadas

| Skill | Influência |
|-------|------------|
| `java-architecture` | Clean Architecture, CQRS commands+queries, state machine no domain |
| `java-dependency-config` | Spring AMQP, CloudEvents, Flyway |
| `java-code-quality` | Records, enums, encapsulamento de estado |
| `java-testing` | JUnit 5 + AssertJ + Mockito, Testcontainers (PostgreSQL + RabbitMQ) |
| `java-observability` | Logging por transição de estado |
| `react-architecture` | Feature module com pages, hooks, api, types |

## Fases de Implementação

### Fase 1 — Infraestrutura Backend (Tasks 1.0 a 3.0)
Migration, domain entities, repositórios, Outbox Pattern, event consumers.

### Fase 2 — Lógica de Negócio + API (Tasks 4.0 a 5.0)
Commands, queries, controller, exception handler.

### Fase 3 — Testes Backend (Task 6.0)
Unitários e integração com Testcontainers.

### Fase 4 — Frontend (Tasks 7.0 a 8.0)
API client, hooks, componentes, páginas, roteamento.

## Tarefas

- [ ] 1.0 Migration + Domain entities (ProcessoDistribuicao, Snapshots, OutboxEvent)
- [ ] 2.0 Outbox Pattern: writer, publisher, worker (portado de arrecadação)
- [ ] 3.0 Event consumers: Rol e Verba (listeners + handlers)
- [ ] 4.0 Commands: criar, aprovar, finalizar, cancelar, calcular (stub)
- [ ] 5.0 Queries + Controller + Exception handler
- [ ] 6.0 Testes backend: unitários e integração
- [ ] 7.0 Frontend: tipos, API client, hooks
- [ ] 8.0 Frontend: componentes, páginas, roteamento

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

### Categorias Obrigatórias

| # | Categoria | Task(s) / N/A | Status |
|---|-----------|---------------|--------|
| 1 | Setup / Configuração | 1.0 (migration), 2.0 (outbox config), 3.0 (RabbitMQ queues) | ✅ |
| 2 | Modelos de Dados | 1.0 | ✅ |
| 3 | Lógica de Negócio | 4.0 (commands), 1.0 (estado na entidade) | ✅ |
| 4 | Endpoints / Interfaces | 5.0 | ✅ |
| 5 | Integrações Externas | 2.0 (Outbox → RabbitMQ), 3.0 (RabbitMQ → snapshots) | ✅ |
| 6 | Validações e Erros | 4.0, 5.0 (exception handler) | ✅ |
| 7 | Testes | 6.0 | ✅ |
| 8 | Observabilidade | 4.0 (logs por transição) | ✅ |
| 9 | Documentação | N/A — PRD, TechSpec e contract existem | ✅ |
| 10 | Segurança | 5.0 (roles no controller) | ✅ |

## Análise de Paralelização

### Lanes de Execução Paralela

| Lane | Tarefas | Descrição |
|------|---------|-----------|
| Lane A (Backend core) | 1.0 → 2.0 → 3.0 → 4.0 → 5.0 → 6.0 | Caminho crítico |
| Lane B (Frontend) | 7.0 → 8.0 | Paralelo com backend (usa mock server) |

### Caminho Crítico

```
1.0 → 2.0 → 4.0 → 5.0 → 6.0
```

### Diagrama de Dependências

```
1.0 Migration + Domain
 ├──→ 2.0 Outbox Pattern
 │     └──→ 4.0 Commands (usa OutboxEventWriter)
 │           └──→ 5.0 Queries + Controller
 │                 └──→ 6.0 Testes Backend
 └──→ 3.0 Event Consumers (paralelo com 2.0)
       └──→ 4.0 (também depende de snapshots)

7.0 Frontend: tipos + hooks (paralelo, usa mock)
 └──→ 8.0 Frontend: componentes + páginas
```
