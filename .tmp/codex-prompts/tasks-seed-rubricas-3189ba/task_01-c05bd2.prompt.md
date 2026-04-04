# Implementation Task: task_01.md

## Task Context

- **Domain**: Infrastructure
- **Type**: Configuration
- **Scope**: Full
- **Complexity**: low


<required_skills>
- `cy-workflow-memory`: required when workflow memory paths are provided for this task
- `cy-execute-task`: required end-to-end workflow for a PRD task
- `cy-final-verify`: required before any completion claim or automatic commit
</required_skills>

<critical>
- Use installed `cy-workflow-memory` before editing code when workflow memory paths are provided below.
- Use installed `cy-execute-task` as the execution workflow for this task.
- Read `AGENTS.md`, `CLAUDE.md`, and the PRD documents under `/home/tsgomes/mcad/.compozy/tasks/seed-rubricas` before editing code.
- Treat the task specification below plus the supporting PRD documents, especially `_techspec.md` and `_tasks.md`, as the source of truth.
- Keep scope tight to this task and record meaningful follow-up work instead of expanding scope silently.
- Use installed `cy-final-verify` before any completion claim or automatic commit.
- Automatic commits are disabled for this run (`--auto-commit=false`).
</critical>

## Workflow Memory

- Memory directory: `/home/tsgomes/mcad/.compozy/tasks/seed-rubricas/memory`
- Shared workflow memory: `/home/tsgomes/mcad/.compozy/tasks/seed-rubricas/memory/MEMORY.md`
- Current task memory: `/home/tsgomes/mcad/.compozy/tasks/seed-rubricas/memory/task_01.md`
- Use installed `cy-workflow-memory` before editing code and before finishing the task.
- Read both memory files before implementation. Promote durable cross-task context only to shared workflow memory.
- Keep task-local decisions, learnings, touched surfaces, and corrections in the current task memory file.


## Task Specification

---
status: pending
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

- [ ] 1.1 Criar script SQL para schema `arrecadacao` com usuário dedicado e grants
- [ ] 1.2 Atualizar `docker-compose.dev.yml` com comentário/referência ao serviço arrecadacao-api (porta 5003)
- [ ] 1.3 Validar que o script é idempotente (reexecução não falha)
- [ ] 1.4 Testar conectividade: `arrecadacao_svc` acessa apenas schema `arrecadacao`

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
  - [ ] Script executa sem erro em database limpo (`docker compose down -v && docker compose up`)
  - [ ] Script reexecuta sem erro (idempotente)
  - [ ] `arrecadacao_svc` consegue conectar e fazer SELECT no schema `arrecadacao`
  - [ ] `arrecadacao_svc` NÃO consegue acessar schema `cadastro` ou `public`

## Success Criteria

- Schema `arrecadacao` existe no PostgreSQL após `docker compose up`
- Role `arrecadacao_svc` criada com grants corretos
- Script é idempotente


## Task Files

- PRD directory: `/home/tsgomes/mcad/.compozy/tasks/seed-rubricas`
- Task file: `/home/tsgomes/mcad/.compozy/tasks/seed-rubricas/task_01.md`
- Master tasks file: `/home/tsgomes/mcad/.compozy/tasks/seed-rubricas/_tasks.md`
- Use these exact paths when `cy-execute-task` updates task tracking.
- Execute every explicit `Validation`, `Test Plan`, or `Testing` item from the task and supporting PRD docs.
- Update task checkboxes and task status only after implementation, verification evidence, and self-review are complete.
- Update the master tasks file only when the current task is actually complete.
- Keep tracking-only files out of automatic commits unless the repository explicitly requires them to be staged.
- Do not create an automatic commit for this run. Leave the diff ready for manual review.
