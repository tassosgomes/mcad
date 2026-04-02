# Resumo de Tarefas — F08: Eventos de Cadastro

## Visão Geral

Implementação da publicação de 8 eventos CloudEvents no RabbitMQ via Outbox Pattern. 100% backend — sem frontend. São 9 tarefas sequenciais (sem lanes paralelas — feature backend-only).

## Skills de Stack Consultadas

| Skill | Influência |
|-------|------------|
| `dotnet-architecture` | Domain Events, BackgroundService, Outbox Pattern |
| `dotnet-dependency-config` | RabbitMQ.Client, CloudNative.CloudEvents |
| `dotnet-observability` | Logging do worker, métricas de publicação |
| `dotnet-testing` | Mock RabbitMQ, testes transacionais |

## Fases de Implementação

### Fase 1 — Fundação (Tasks 1-4)
Entidade OutboxEvent, migration, OutboxEventWriter, constantes EventTypes.

### Fase 2 — Publicação (Tasks 5-6)
RabbitMqPublisher, OutboxPublisherWorker (BackgroundService).

### Fase 3 — Integração + Testes (Tasks 7-9)
Integrar 8 handlers, Program.cs, testes.

## Tarefas

- [ ] 1.0 Domain: OutboxEvent entidade + IOutboxEventWriter interface
- [ ] 2.0 Infra: OutboxEventConfiguration + Migration
- [ ] 3.0 Infra: OutboxEventWriter (implementação) + EventTypes constantes
- [ ] 4.0 Infra: IRabbitMqPublisher + RabbitMqPublisher (conexão + CloudEvents)
- [ ] 5.0 Infra: OutboxPublisherWorker (BackgroundService)
- [ ] 6.0 Application: Integrar IOutboxEventWriter nos 8 handlers existentes
- [ ] 7.0 API: Program.cs (DI + AddHostedService + env vars + .env.example)
- [ ] 8.0 Testes Unitários: OutboxEvent + Writer + Worker
- [ ] 9.0 Testes Integração: Handler → outbox transacional + Worker publica

## Rastreabilidade US → Tasks

| User Story | Tasks Relacionadas | Tipo de Cobertura |
|---|---|---|
| HU-01 (Identificação recebe fonograma) | 4.0, 5.0, 6.0, 7.0 | Direta |
| HU-02 (Analytics recebe transições) | 3.0, 4.0, 5.0, 6.0 | Direta |
| HU-03 (Distribuição sabe depuração) | 6.0 | Direta |

## Validação de Cobertura

### Requisitos Funcionais

| Requisito | Task(s) | Status |
|---|---|---|
| RF-01 (cadastro.obra.liberada) | 6.0 | ✅ |
| RF-02 (cadastro.obra.bloqueada) | 6.0 | ✅ |
| RF-03 (cadastro.obra.dominio-publico) | 6.0 | ✅ |
| RF-04 (cadastro.obra.depurada) | 6.0 | ✅ |
| RF-05 (cadastro.fonograma.liberado) | 6.0 | ✅ |
| RF-06 (cadastro.fonograma.depurado) | 6.0 | ✅ |
| RF-07 (cadastro.fonograma.bloqueado) | 6.0 | ✅ |
| RF-08 (cadastro.titular.criado) | 6.0 | ✅ |
| RF-09 (CloudEvents 1.0) | 4.0, 5.0 | ✅ |
| RF-10 (atributos obrigatórios) | 4.0, 5.0 | ✅ |
| RF-11 (campo data JSON) | 3.0, 4.0 | ✅ |
| RF-12 (campo subject) | 3.0, 6.0 | ✅ |
| RF-13 (exchange topic) | 4.0 | ✅ |
| RF-14 (routing key) | 3.0, 4.0 | ✅ |
| RF-15 (exchange auto-create) | 4.0 | ✅ |
| RF-16 (tabela outbox) | 1.0, 2.0 | ✅ |
| RF-17 (mesma transação) | 3.0, 6.0 | ✅ |
| RF-18 (worker background) | 5.0 | ✅ |
| RF-19 (published_at) | 5.0 | ✅ |
| RF-20 (retry attempts) | 5.0 | ✅ |
| RF-21 (max 10 tentativas) | 1.0, 5.0 | ✅ |
| RF-22 (intervalo 5s) | 5.0, 7.0 | ✅ |
| RF-23 (UUID único) | 1.0 | ✅ |
| RF-24 (at-least-once) | 5.0 | ✅ |
| RF-25 (MessageId) | 4.0 | ✅ |

### Categorias Obrigatórias

| # | Categoria | Task(s) / N/A | Status |
|---|---|---|---|
| 1 | Setup / Configuração | 7.0 (Program.cs, .env) | ✅ |
| 2 | Modelos de Dados | 1.0, 2.0 | ✅ |
| 3 | Lógica de Negócio | 3.0, 5.0, 6.0 | ✅ |
| 4 | Endpoints / Interfaces | N/A — sem endpoints REST | ✅ |
| 5 | Integrações Externas | 4.0 (RabbitMQ) | ✅ |
| 6 | Validações e Erros | 5.0 (retry, max attempts) | ✅ |
| 7 | Testes | 8.0, 9.0 | ✅ |
| 8 | Observabilidade | 5.0 (logging worker) | ✅ |
| 9 | Documentação | N/A — backend infra | ✅ |
| 10 | Segurança | N/A — auth retroativa | ✅ |

## Análise de Paralelização

Feature backend-only — sequencial com poucos pontos de paralelização.

```
[1.0 Domain OutboxEvent] → [2.0 Migration] → [3.0 Writer+Constants]
                                                       ↓
                                              [4.0 RabbitMqPublisher] → [5.0 Worker]
                                                                              ↓
                                                                    [6.0 Integrar Handlers]
                                                                              ↓
                                                                    [7.0 Program.cs]
                                                                              ↓
                                                                    [8.0 Testes Unit] → [9.0 Testes Integração]
```
