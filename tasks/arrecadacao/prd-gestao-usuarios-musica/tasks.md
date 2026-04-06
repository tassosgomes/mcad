# Resumo de Tarefas — F02: Gestao de Usuarios de Musica (Backend)

## Visao Geral

Implementacao completa do CRUD de Usuarios de Musica no servico `arrecadacao-api` (Java Spring Boot). Primeira feature CRUD do dominio Arrecadacao — estabelece padroes de Value Objects, Embeddables, CQRS Commands, Specification e testes que serao reutilizados por F03, F04, F05 e F06.

## Skills de Stack Consultadas

| Skill | Influencia |
|-------|------------|
| `java-architecture` | Clean Architecture multi-module, CQRS type-safe, Repository Pattern |
| `java-testing` | JUnit 5 + AssertJ + Mockito (AAA), Testcontainers PostgreSQL |
| `java-code-quality` | Naming, records para DTOs, Value Objects imutaveis |
| `java-dependency-config` | Spring Data JPA, Flyway, Spring Validation |
| `java-observability` | Logging JSON estruturado, health checks Actuator |
| `common-restful-api` | Paginacao page/size, sort `-` prefix, RFC 7807 |

## Tarefas

- [x] 1.0 Migration: tabelas usuarios_musica e historico_status_usuario
- [x] 2.0 Domain Layer: entidades, Value Objects, enums e interfaces
- [x] 3.0 Infrastructure: repositorios JPA e Spring Data
- [x] 4.0 CQRS Foundation e Commands com handlers
- [x] 5.0 Queries, DTOs e Specification
- [x] 6.0 API Layer: controller, exception handler e seguranca
- [x] 7.0 Testes de integracao (persistence + endpoints)

## Rastreabilidade US -> Tasks

| User Story | Tasks Relacionadas | Tipo de Cobertura |
|------------|--------------------|-------------------|
| HU-01 — Cadastrar | 1.0, 2.0, 3.0, 4.0, 6.0 | Direta |
| HU-02 — Buscar endereco CEP | N/A backend (frontend-only) | — |
| HU-03 — Editar | 2.0, 4.0, 6.0 | Direta |
| HU-04 — Inativar | 2.0, 4.0, 6.0 | Direta |
| HU-05 — Reativar | 2.0, 4.0, 6.0 | Direta |
| HU-06 — Consultar | 3.0, 5.0, 6.0 | Direta |
| HU-07 — Visualizar historico | 3.0, 5.0, 6.0 | Direta |
| HU-08 — Selecionar Usuario (F03) | 5.0, 6.0 | Suporte |

## Validacao de Cobertura

### Requisitos Funcionais

| Requisito | Task(s) | Status |
|-----------|---------|--------|
| RF-01 Criar com dados completos, status ATIVO | 2.0, 4.0 | ✅ Coberto |
| RF-02 CNPJ Value Object modulo 11 alfanumerico | 2.0 | ✅ Coberto |
| RF-03 Unicidade por CNPJ | 2.0, 4.0, 7.0 | ✅ Coberto |
| RF-04 Editar exceto CNPJ | 2.0, 4.0 | ✅ Coberto |
| RF-05 Sem exclusao fisica | 2.0 (sem DELETE) | ✅ Coberto |
| RF-06 Nome responsavel obrigatorio | 2.0, 5.0 | ✅ Coberto |
| RF-07 Razao social min 3 chars | 2.0, 5.0 | ✅ Coberto |
| RF-08 ViaCEP frontend | N/A backend | ✅ N/A |
| RF-09 Fallback manual CEP | N/A backend | ✅ N/A |
| RF-10 Campos ViaCEP editaveis | N/A backend | ✅ N/A |
| RF-11 Inativar com justificativa | 2.0, 4.0 | ✅ Coberto |
| RF-12 Reativar com justificativa | 2.0, 4.0 | ✅ Coberto |
| RF-13 Ativacao/inativacao N vezes | 2.0 | ✅ Coberto |
| RF-14 Historico de status | 2.0, 3.0, 5.0 | ✅ Coberto |
| RF-15 Inativo nao recebe licencas | N/A (validacao em F03) | ✅ N/A |
| RF-16 Listagem paginada | 5.0, 6.0 | ✅ Coberto |
| RF-17 Filtros: razaoSocial, cnpj, status, cidade | 5.0 | ✅ Coberto |
| RF-18 Ordenacao sort com `-` prefix | 5.0 | ✅ Coberto |
| RF-19 Endpoint busca por ID | 5.0, 6.0 | ✅ Coberto |

### Categorias Obrigatorias

| # | Categoria | Task(s) / N/A | Status |
|---|-----------|---------------|--------|
| 1 | Setup / Configuracao | 1.0 (migration), 4.0 (pom.xml) | ✅ |
| 2 | Modelos de Dados | 1.0 (DDL), 2.0 (entities) | ✅ |
| 3 | Logica de Negocio | 2.0 (domain methods), 4.0 (command handlers) | ✅ |
| 4 | Endpoints / Interfaces | 6.0 (controller 7 endpoints) | ✅ |
| 5 | Integracoes Externas | N/A — sem integracoes backend (ViaCEP e frontend-only) | ✅ |
| 6 | Validacoes e Erros | 2.0 (domain), 5.0 (Bean Validation), 6.0 (GlobalExceptionHandler) | ✅ |
| 7 | Testes | 2.0, 4.0, 5.0 (unit), 7.0 (integration) | ✅ |
| 8 | Observabilidade | 6.0 (logging nos handlers, Actuator health) | ✅ |
| 9 | Documentacao | N/A — API docs via OpenAPI contract ja existente | ✅ |
| 10 | Seguranca | 6.0 (@PreAuthorize roles, JWT autor) | ✅ |

## Analise de Paralelizacao

### Lanes de Execucao

```
Lane A (sequencial — caminho critico):
  1.0 → 2.0 → 3.0 → 4.0 → 5.0 → 6.0 → 7.0

Nao ha paralelizacao significativa — cada camada depende da anterior.
Excecao: tasks 4.0 e 5.0 compartilham CQRS foundation mas Commands e Queries
podem ser desenvolvidos em paralelo se a foundation (interfaces + dispatchers)
for extraida como subtarefa inicial de 4.0.
```

### Caminho Critico

1.0 → 2.0 → 3.0 → 4.0 → 5.0 → 6.0 → 7.0

Tempo estimado: ~3-4 dias de implementacao por agente.

### Diagrama de Dependencias

```
1.0 Migration
 └──→ 2.0 Domain Layer
       └──→ 3.0 Infrastructure
             └──→ 4.0 CQRS + Commands
             │     └──→ 5.0 Queries + DTOs
             │           └──→ 6.0 API Layer
             │                 └──→ 7.0 Integration Tests
             └──────────────────────┘
```
