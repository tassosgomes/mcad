---
status: pending
domain: Database
type: Feature Implementation
scope: Full
complexity: medium
dependencies:
  - task_03
---

# Task 04: Infra persistence — JPA, Flyway, seed

## Overview

Implementar a camada de persistência: mapeamento JPA das entidades `Rubrica` e `OutboxEvent`, repositórios Spring Data, e migrations Flyway para criação das tabelas e seed das 7 rubricas. Esta task garante que as rubricas estejam disponíveis no banco desde o primeiro startup (RF-01, RF-03).

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC sections "Modelos de Dados — Schema PostgreSQL" and "Dados do Seed (Flyway migration)"
- REFERENCE PRD requirements RF-01, RF-02, RF-03
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST mapear `Rubrica` como JPA entity na tabela `arrecadacao.rubricas` com constraint UNIQUE em sigla
- MUST mapear `OutboxEvent` como JPA entity na tabela `arrecadacao.outbox_events` com índice parcial para pendentes
- MUST criar Spring Data interfaces `SpringDataRubricaRepository` e `SpringDataOutboxEventRepository`
- MUST criar classes adapter `JpaRubricaRepository` e `JpaOutboxEventRepository` que implementam interfaces do domain
- MUST criar migration `V1__create_tables.sql` com tabelas rubricas e outbox_events
- MUST criar migration `V2__seed_rubricas.sql` com INSERT das 7 rubricas usando UUIDs determinísticos
- MUST usar `ON CONFLICT (sigla) DO NOTHING` para idempotência do seed
- MUST configurar Hibernate `ddl-auto: validate` (Flyway gerencia schema)
</requirements>

## Subtasks

- [ ] 4.1 Criar mapeamentos JPA para `Rubrica` e `OutboxEvent` (annotations ou Fluent API)
- [ ] 4.2 Criar Spring Data interfaces (`SpringDataRubricaRepository`, `SpringDataOutboxEventRepository`)
- [ ] 4.3 Criar adapters JPA que implementam interfaces do domain
- [ ] 4.4 Criar migration `V1__create_tables.sql` (tabelas + índice)
- [ ] 4.5 Criar migration `V2__seed_rubricas.sql` (7 rubricas com UUIDs determinísticos)
- [ ] 4.6 Escrever testes de integração com Testcontainers PostgreSQL

## Implementation Details

Referência: TechSpec seções "Schema PostgreSQL" e "Dados do Seed".

UUIDs determinísticos (hardcoded) conforme TechSpec para referência estável cross-service.

Padrão .NET equivalente: `services/cadastro-api/4-Infra/Cadastro.Infra/Data/Configurations/` (Fluent API) e `services/cadastro-api/4-Infra/Cadastro.Infra/Repositories/`.

### Relevant Files
- `services/cadastro-api/4-Infra/Cadastro.Infra/Data/CadastroDbContext.cs` — referência de DbContext com schema isolado
- `services/cadastro-api/4-Infra/Cadastro.Infra/Data/Configurations/OutboxEventConfiguration.cs` — referência de mapping do OutboxEvent
- `services/cadastro-api/4-Infra/Cadastro.Infra/Data/Migrations/` — referência de migrations EF Core

### Dependent Files
- `services/arrecadacao-api/arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/entities/` — entidades criadas em task_03
- `services/arrecadacao-api/arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/interfaces/` — interfaces criadas em task_03
- `services/arrecadacao-api/arrecadacao-infra/src/main/resources/db/migration/` — local das migrations Flyway

## Deliverables

- JPA entity mappings para Rubrica e OutboxEvent
- Spring Data repositories + adapters implementando interfaces do domain
- `V1__create_tables.sql` criando tabelas rubricas e outbox_events
- `V2__seed_rubricas.sql` inserindo 7 rubricas com UUIDs determinísticos
- Integration tests with Testcontainers **(REQUIRED)**

## Tests

- Integration tests (Testcontainers PostgreSQL):
  - [ ] Flyway executa migrations V1 e V2 sem erro
  - [ ] Após startup, existem exatamente 7 rubricas no banco
  - [ ] `findAll()` retorna 7 rubricas com dados corretos (sigla, nome, exigeClassificacao)
  - [ ] `findBySigla("TV_ABERTA")` retorna rubrica com exigeClassificacao = true
  - [ ] `findBySigla("INEXISTENTE")` retorna Optional.empty()
  - [ ] Seed é idempotente: reexecutar V2 não duplica registros
  - [ ] Índice parcial `ix_outbox_events_pending` existe na tabela outbox_events
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- Flyway migrations executam sem erro em Testcontainers PostgreSQL
- 7 rubricas presentes após startup com dados corretos
- Seed idempotente (RF-03)
- Repositórios read-only funcionais
