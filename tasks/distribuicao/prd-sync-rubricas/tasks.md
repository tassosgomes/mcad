# Resumo de Tarefas — F01: Sincronização de Rubricas (Distribuição)

## Visão Geral

Implementação do serviço `distribuicao-api` (Java Spring Boot) e do módulo frontend para sincronização de rubricas via eventos da Arrecadação. Primeiro consumidor de eventos RabbitMQ do projeto.

## Skills de Stack Consultadas

| Skill | Influência |
|-------|------------|
| `java-architecture` | Estrutura multi-módulo Maven, Clean Architecture, CQRS |
| `java-dependency-config` | Spring Boot 3.3, Spring AMQP, CloudEvents, Flyway |
| `java-code-quality` | Records para DTOs, naming conventions, null handling |
| `java-testing` | JUnit 5 + AssertJ + Mockito, Testcontainers (PostgreSQL + RabbitMQ) |
| `java-observability` | Logging estruturado, health checks via Actuator |
| `react-architecture` | Estrutura features/{domain}/{subfeature}/ |
| `common-restful-api` | `/api/v1/`, RFC 7807, camelCase |

## Fases de Implementação

### Fase 1 — Backend (Tasks 1.0 a 6.0)
Scaffolding do projeto Maven, domain layer, persistência, consumidor RabbitMQ, API REST e testes.

### Fase 2 — Frontend (Task 7.0)
Módulo React com API client, página de listagem e integração de roteamento.

## Tarefas

- [x] 1.0 Scaffolding do projeto Maven multi-módulo
- [x] 2.0 Domain layer: entidade Rubrica, repositório e migration
- [x] 3.0 Consumidor RabbitMQ: listener, handler e configuração
- [x] 4.0 Application + API: queries, controller, security e error handler
- [x] 5.0 Infraestrutura: Docker Compose, scripts e variáveis de ambiente
- [x] 6.0 Testes backend: unitários e integração
- [x] 7.0 Frontend: módulo distribuicao/rubricas

## Rastreabilidade US → Tasks

| User Story | Tasks Relacionadas | Tipo de Cobertura |
|------------|--------------------|-------------------|
| HU-01 — Sincronização automática | 2.0, 3.0 | Direta |
| HU-02 — Consultar rubricas | 4.0, 7.0 | Direta |
| HU-03 — Selecionar rubrica ao criar processo | 4.0 | Suporte (endpoint pronto para F02) |

## Validação de Cobertura

### Requisitos Funcionais

| Requisito | Task(s) | Status |
|-----------|---------|--------|
| RF-01 — Consumir `arrecadacao.rubrica.criada` | 3.0 | ✅ Coberto |
| RF-02 — Consumir `arrecadacao.rubrica.atualizada` | 3.0 | ✅ Coberto |
| RF-03 — Idempotência (upsert por sigla) | 3.0 | ✅ Coberto |
| RF-04 — Sigla como chave natural | 2.0, 3.0 | ✅ Coberto |
| RF-05 — Payload inválido descartado com log | 3.0 | ✅ Coberto |
| RF-06 — API listagem de rubricas | 4.0 | ✅ Coberto |
| RF-07 — API busca por sigla | 4.0 | ✅ Coberto |
| RF-08 — Apenas GET exposto (405 para escrita) | 4.0 | ✅ Coberto |
| RF-09 — Tela de listagem read-only | 7.0 | ✅ Coberto |
| RF-10 — Indicação visual read-only | 7.0 | ✅ Coberto |
| RF-11 — Estado vazio com mensagem | 7.0 | ✅ Coberto |

### Artefatos da TechSpec

| Artefato | Task | Status |
|----------|------|--------|
| Parent POM + módulos (6 POMs) | 1.0 | ✅ |
| `Rubrica.java` (entity) | 2.0 | ✅ |
| `RubricaRepository.java` (interface) | 2.0 | ✅ |
| `NotFoundException.java` | 2.0 | ✅ |
| `V1__create_schema_and_rubricas.sql` | 2.0 | ✅ |
| `SpringDataRubricaRepository.java` | 2.0 | ✅ |
| `JpaRubricaRepository.java` | 2.0 | ✅ |
| `RubricaEventPayload.java` | 3.0 | ✅ |
| `RubricaEventListener.java` | 3.0 | ✅ |
| `RubricaEventHandler.java` | 3.0 | ✅ |
| `RabbitMqConfig.java` | 3.0 | ✅ |
| `RubricaResponse.java` (DTO) | 4.0 | ✅ |
| `ListarRubricasQuery*.java` (query + handler) | 4.0 | ✅ |
| `BuscarRubricaPorSiglaQuery*.java` (query + handler) | 4.0 | ✅ |
| `RubricaController.java` | 4.0 | ✅ |
| `SecurityConfig.java` | 4.0 | ✅ |
| `GlobalExceptionHandler.java` | 4.0 | ✅ |
| `DistribuicaoApiApplication.java` | 1.0 | ✅ |
| `application.yml` | 1.0 | ✅ |
| `docker-compose.dev.yml` (modificar) | 5.0 | ✅ |
| `provision-keycloak.sh` (modificar) | 5.0 | ✅ |
| `dev.sh` (modificar) | 5.0 | ✅ |
| `.env.example` (modificar) | 5.0 | ✅ |
| Testes unitários (2 arquivos) | 6.0 | ✅ |
| Testes integração (2 arquivos) | 6.0 | ✅ |
| `apiDistribuicaoClient.ts` | 7.0 | ✅ |
| `rubrica.ts` (types) | 7.0 | ✅ |
| `rubricasApi.ts` | 7.0 | ✅ |
| `useRubricas.ts` | 7.0 | ✅ |
| `RubricasTable.tsx` | 7.0 | ✅ |
| `RubricasPage.tsx` | 7.0 | ✅ |
| `index.ts` (barrel) | 7.0 | ✅ |
| `index.tsx` (router distribuicao) | 7.0 | ✅ |
| `AuthProvider.tsx` (modificar) | 7.0 | ✅ |
| `routes.tsx` (modificar) | 7.0 | ✅ |
| `Sidebar.tsx` (modificar) | 7.0 | ✅ |

### Categorias Obrigatórias

| # | Categoria | Task(s) / N/A | Status |
|---|-----------|---------------|--------|
| 1 | Setup / Configuração | 1.0, 5.0 | ✅ |
| 2 | Modelos de Dados | 2.0 | ✅ |
| 3 | Lógica de Negócio | 3.0 | ✅ |
| 4 | Endpoints / Interfaces | 4.0 | ✅ |
| 5 | Integrações Externas | 3.0 (RabbitMQ consumer) | ✅ |
| 6 | Validações e Erros | 3.0 (payload), 4.0 (405/404) | ✅ |
| 7 | Testes | 6.0 | ✅ |
| 8 | Observabilidade | 3.0 (logs), 4.0 (actuator) | ✅ |
| 9 | Documentação | N/A — PRD, TechSpec e contract já existem | ✅ |
| 10 | Segurança | 4.0 (JWT/OAuth2) | ✅ |

## Análise de Paralelização

### Lanes de Execução Paralela

| Lane | Tarefas | Descrição |
|------|---------|-----------|
| Lane A (Backend core) | 1.0 → 2.0 → 3.0 → 4.0 → 6.0 | Caminho crítico — scaffolding até testes |
| Lane B (Infra) | 5.0 | Pode iniciar após 1.0 (paralelo com 2.0+) |
| Lane C (Frontend) | 7.0 | Pode iniciar após 5.0 (precisa de env vars e sidebar) |

### Caminho Crítico

```
1.0 → 2.0 → 3.0 → 4.0 → 6.0
```

### Diagrama de Dependências

```
1.0 Scaffolding
 ├──→ 2.0 Domain + Migration
 │     ├──→ 3.0 RabbitMQ Consumer
 │     │     └──→ 4.0 Application + API
 │     │           └──→ 6.0 Testes Backend
 │     └──→ 4.0 (também depende de 2.0)
 └──→ 5.0 Infra Scripts (paralelo)
       └──→ 7.0 Frontend (paralelo com 3.0+)
```
