---
status: completed
domain: Infrastructure
type: Configuration
scope: Full
complexity: low
dependencies: []
---

# Task 01: Scripts SQL + Docker Compose

## Overview

Criar o schema PostgreSQL `arrecadacao`, o usuário dedicado `arrecadacao_svc` com grants restritos, e atualizar o docker-compose com referência ao novo serviço Java. Esta é a fundação de infraestrutura que permite o Flyway criar tabelas no schema correto.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC section "Scripts de Banco de Dados" for exact SQL
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST create schema `arrecadacao` no PostgreSQL via script init
- MUST create role `arrecadacao_svc` com LOGIN e password configurável
- MUST grant SELECT, INSERT, UPDATE, DELETE no schema `arrecadacao` ao `arrecadacao_svc`
- MUST revogar acesso do `arrecadacao_svc` a schemas de outros domínios (public, cadastro, identificacao)
- MUST atualizar `01-create-schemas.sql` ou criar `02-setup-arrecadacao-schema.sql`
</requirements>

## Subtasks

- [x] 1.1 Criar script SQL para schema `arrecadacao` com usuário dedicado e grants
- [x] 1.2 Atualizar `docker-compose.dev.yml` com comentário/referência ao serviço arrecadacao-api (porta 5003)
- [x] 1.3 Validar que o script é idempotente (reexecução não falha)
- [x] 1.4 Testar conectividade: `arrecadacao_svc` acessa apenas schema `arrecadacao`

## Implementation Details

Referência principal: TechSpec seção "Scripts de Banco de Dados" para o SQL exato.

### Relevant Files
- `scripts/postgres-init/01-create-schemas.sql` — script existente que cria schema keycloak; adicionar arrecadacao aqui ou criar arquivo separado
- `docker-compose.dev.yml` — infraestrutura Docker; adicionar referência ao novo serviço

### Dependent Files
- `services/arrecadacao-api/arrecadacao-infra/src/main/resources/application.yml` — usará `arrecadacao_svc` como datasource user (task_02)

## Deliverables

- Script SQL `scripts/postgres-init/02-setup-arrecadacao-schema.sql` criado
- `docker-compose.dev.yml` atualizado com referência ao arrecadacao-api
- Validação manual: script executa sem erro em PostgreSQL limpo e em reexecução

## Tests

- Validação manual (scripts SQL init não têm framework de teste automatizado):
  - [x] Script executa sem erro em database limpo (`docker compose down -v && docker compose up`)
  - [x] Script reexecuta sem erro (idempotente)
  - [x] `arrecadacao_svc` consegue conectar e fazer SELECT no schema `arrecadacao`
  - [x] `arrecadacao_svc` NÃO consegue acessar schema `cadastro` ou `public`

## Success Criteria

- Schema `arrecadacao` existe no PostgreSQL após `docker compose up`
- Role `arrecadacao_svc` criada com grants corretos
- Script é idempotente
