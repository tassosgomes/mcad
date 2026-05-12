# Resumo de Tarefas — F05: Calculo e Disponibilizacao de Verba Liquida

## Visao Geral

Implementacao da F05 no `arrecadacao-api` (Java Spring Boot) com cinco frentes principais: (1) novo agregado `Verba` materializado por `(rubricaId, periodo)`, (2) servico de calculo + recalculo incremental com lock pessimista, (3) integracao automatica nos fluxos de pagamento (F04) e estorno (F06), (4) consumer de eventos da Distribuicao para gerenciar o ciclo `ABERTA → EM_DISTRIBUICAO → DISTRIBUIDA`, e (5) tela de acompanhamento React com visao detalhada e agregada por rubrica. Substitui a `VerbaServiceNoOp` por implementacao real e refatora a interface para unificar o lock entre F04 e F06.

## Skills de Stack Consultadas

| Skill | Influencia |
|-------|------------|
| `java-architecture` | Multi-modulo, CQRS sem MediatR, Repository Pattern, domain methods |
| `java-dependency-config` | Spring Data JPA, Flyway V13, Specification |
| `java-code-quality` | Records para DTOs, `BigDecimal` com `setScale(2, HALF_UP)`, guards |
| `java-testing` | JUnit 5 + AssertJ + Mockito (AAA), Testcontainers PostgreSQL |
| `java-observability` | SLF4J estruturado, MDC `rubrica`/`periodo`, Micrometer counters |
| `common-restful-api` | Paginacao `page/size`, sort com prefixo `-`, RFC 7807 |
| `react-architecture` | Feature module flat, hooks por endpoint, pages/components split |
| `react-code-quality` | TypeScript strict, CSS Modules, forms manuais |

## Fases de Implementacao

### Fase 1 — Backend Domain + Persistence (Tasks 1.0-4.0)
Estabelece a base: migration, entidade, repositorios, refatoracao da interface `VerbaService`. Tasks 2.0, 3.0 e 4.0 sao independentes apos 1.0 e podem rodar em paralelo.

### Fase 2 — Backend Service + Integracao (Tasks 5.0-8.0)
Implementa o servico de calculo, integra ao fluxo de pagamento, expoe endpoints REST e adiciona o consumer de eventos da Distribuicao. Tasks 6.0, 7.0 e 8.0 sao paralelizaveis apos 5.0.

### Fase 3 — Testes + Frontend (Tasks 9.0-10.0)
Testes de integracao com Testcontainers e modulo frontend completo. Task 10.0 pode iniciar apos task 7.0 (contrato definido) usando mocks.

## Tarefas

- [x] 1.0 Migration V13 + Domain Layer (Verba entity, StatusVerba enum, exceptions, repository interface)
- [x] 2.0 Infrastructure: Verba persistence (JpaVerbaRepository + Spring Data + lock pessimista)
- [x] 3.0 PagamentoRepository: novo agregado `sumAndCountConfirmados(rubricaId, periodo)`
- [x] 4.0 Refatorar interface `VerbaService` + atualizar `EstornarPagamentoCommandHandler`
- [x] 5.0 `VerbaServiceImpl`: calculo, upsert e publicacao de evento Outbox
- [x] 6.0 Integrar `RegistrarPagamentoCommandHandler` com `VerbaService` (lock + recalculo)
- [x] 7.0 Queries + DTOs + `VerbaSpecification` + `VerbaController` (3 endpoints)
- [x] 8.0 RabbitMQ: config + `DistribuicaoProcessoEventListener` (consumer)
- [x] 9.0 Testes de integracao (Testcontainers + AMQP simulado)
- [x] 10.0 Frontend: modulo `verbas` (types, api, hooks, components, pages, routing, sidebar)

## Rastreabilidade US -> Tasks

| User Story | Tasks Relacionadas | Tipo de Cobertura |
|------------|--------------------|-------------------|
| HU-01 Calculo ao registrar pagamento | 1.0, 2.0, 3.0, 5.0, 6.0 | Direta |
| HU-02 Recalculo ao estornar pagamento | 1.0, 2.0, 3.0, 4.0, 5.0 | Direta |
| HU-03 Acompanhar verbas (detalhada) | 7.0, 10.0 | Direta |
| HU-04 Acompanhar verbas (agregada por rubrica) | 7.0, 10.0 | Direta |
| HU-05 Visualizar status da verba | 1.0, 7.0, 8.0, 10.0 | Direta |

## Validacao de Cobertura

### Requisitos Funcionais

| Requisito | Task(s) | Status |
|-----------|---------|--------|
| RF-01 Entidade Verba materializada | 1.0 (entity, enum), 2.0 (persistence) | Planejado |
| RF-02 Unicidade rubrica x periodo | 1.0 (migration) | Planejado |
| RF-03 Recalculo ao registrar pagamento | 3.0, 5.0, 6.0 | Planejado |
| RF-04 Recalculo ao estornar | 4.0, 5.0 | Planejado |
| RF-05 Formula 85% liquida | 1.0 (domain method `Verba.recalcular`), 5.0 | Planejado |
| RF-06 Criar registro no primeiro pagamento | 1.0 (`Verba.abrir`), 5.0 | Planejado |
| RF-07 Verba zerada apos estorno total | 5.0 (mantem registro com zero) | Planejado |
| RF-08 Tipos decimais alta precisao | 1.0 (DECIMAL 15,2), 5.0 (`setScale`) | Planejado |
| RF-09 Evento `arrecadacao.verba.disponivel` | 5.0 (Outbox) | Planejado |
| RF-10 Evento emitido com verba zerada | 5.0 | Planejado |
| RF-11 Subject `{rubricaSigla}:{periodo}` | 5.0 | Planejado |
| RF-12 Ciclo de status ABERTA/EM_DISTRIBUICAO/DISTRIBUIDA | 1.0 (enum), 8.0 | Planejado |
| RF-13 Consumir `processo.iniciado` | 8.0 | Planejado |
| RF-14 Consumir `processo.finalizado` | 8.0 | Planejado |
| RF-15 Lock rejeita alteracao | 4.0, 5.0, 6.0 | Planejado |
| RF-16 Lock validado antes de pagamento e estorno | 4.0, 6.0 | Planejado |
| RF-17 Listagem detalhada | 7.0, 10.0 | Planejado |
| RF-18 Visao agregada por rubrica | 7.0, 10.0 | Planejado |
| RF-19 Filtros rubrica/periodo/status | 7.0 | Planejado |
| RF-20 Ordenacao padrao | 7.0 | Planejado |
| RF-21 Busca por rubrica+periodo | 7.0, 10.0 | Planejado |

### Categorias Obrigatorias

| # | Categoria | Task(s) / N/A | Status |
|---|-----------|---------------|--------|
| 1 | Setup / Configuracao | 1.0 (migration), 8.0 (RabbitMQ bindings, env vars), 10.0 (rota) | Planejado |
| 2 | Modelos de Dados | 1.0 (DDL + entity + enum), 10.0 (TS types) | Planejado |
| 3 | Logica de Negocio | 1.0 (domain methods), 5.0 (service) | Planejado |
| 4 | Endpoints / Interfaces | 7.0 (3 endpoints REST) | Planejado |
| 5 | Integracoes Externas | 5.0 (Outbox publisher), 8.0 (RabbitMQ consumer) | Planejado |
| 6 | Validacoes e Erros | 1.0 (guards), 5.0 (lock), 7.0 (RFC 7807) | Planejado |
| 7 | Testes | 1.0, 2.0, 5.0, 6.0, 7.0, 8.0 (unit), 9.0 (integration) | Planejado |
| 8 | Observabilidade | 5.0, 8.0 (logs + Micrometer) | Planejado |
| 9 | Documentacao | `docs/events.md` ja atualizado; OpenAPI via api-contract.yaml (planejado, pos-techspec) | Parcial |
| 10 | Seguranca | 7.0 (`@PreAuthorize`), 10.0 (`RequireRole`) | Planejado |

## Analise de Paralelizacao

### Lanes de Execucao Paralela

| Lane | Tarefas | Descricao |
|------|---------|-----------|
| Lane A — Domain + Persistence | 1.0 → (2.0, 3.0, 4.0) | Apos 1.0, 2.0/3.0/4.0 sao independentes |
| Lane B — Service + Trigger | 5.0 → 6.0 | Servico e integracao no handler de pagamento |
| Lane C — API | 5.0 → 7.0 | Endpoints REST de leitura |
| Lane D — Consumer | 4.0 + RabbitMQ → 8.0 | Listener de eventos da Distribuicao |
| Lane E — Testes Integrados | (5.0, 6.0, 7.0, 8.0) → 9.0 | Testcontainers + AMQP |
| Lane F — Frontend | 7.0 (contrato) → 10.0 | Pode usar mock antes do controller estar pronto |

### Caminho Critico

`1.0 → 2.0 → 5.0 → 6.0 → 9.0 → 10.0`

### Diagrama de Dependencias

```
                       1.0 (migration + domain)
                        |
        +---------------+---------------+
        |               |               |
       2.0             3.0             4.0
   (persistence)  (sum/count)    (refactor + F06)
        |               |               |
        +-------+-------+-------+-------+
                |               |
               5.0 ─────────────┴── 8.0 (consumer)
                |                    |
        +-------+-------+            |
        |       |       |            |
       6.0     7.0     ...           |
        |       |                    |
        +-------+--------+-----------+
                         |
                        9.0 (integration tests)
                         |
                        10.0 (frontend) ← pode iniciar apos 7.0
```
