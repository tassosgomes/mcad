# Implementation Task: task_03.md

## Task Context

- **Domain**: Domain
- **Type**: Feature Implementation
- **Scope**: Full
- **Complexity**: medium
- **Dependencies**: task_02


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
- Current task memory: `/home/tsgomes/mcad/.compozy/tasks/seed-rubricas/memory/task_03.md`
- Use installed `cy-workflow-memory` before editing code and before finishing the task.
- Read both memory files before implementation. Promote durable cross-task context only to shared workflow memory.
- Keep task-local decisions, learnings, touched surfaces, and corrections in the current task memory file.


## Task Specification

---
status: pending
domain: Domain
type: Feature Implementation
scope: Full
complexity: medium
dependencies:
  - task_02
---

# Task 03: Domain layer — Rubrica, OutboxEvent, interfaces

## Overview

Implementar a camada de domínio pura do serviço Arrecadação: entidades `Rubrica` e `OutboxEvent`, e interfaces de repositório (`RubricaRepository`, `OutboxEventWriter`, `OutboxEventRepository`). Esta camada não tem dependências externas (zero frameworks) e define os contratos que a infra implementa.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC section "Interfaces Principais" and "Modelos de Dados" for exact signatures
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST criar entidade `Rubrica` com campos: id (UUID), sigla (String), nome (String), exigeClassificacao (boolean)
- MUST criar entidade `Rubrica` imutável (sem setters; construtor protegido para JPA)
- MUST criar entidade `OutboxEvent` com: id, type, routingKey, subject, payload, createdAt, publishedAt, attempts
- MUST criar factory method `OutboxEvent.criar()` e métodos `marcarPublicado()`, `incrementarTentativa()`, `excedeuTentativas()`
- MUST definir `MAX_ATTEMPTS = 10` na entidade OutboxEvent
- MUST criar interface `RubricaRepository` com `findAll()` e `findBySigla(String)`
- MUST criar interface `OutboxEventWriter` com `addEvent(String eventType, String subject, Object data)`
- MUST criar interface `OutboxEventRepository` para leitura de eventos pendentes
- MUST manter módulo domain sem dependências externas (apenas Java SE)
</requirements>

## Subtasks

- [ ] 3.1 Criar entidade `Rubrica` com construtor, getters e construtor protegido JPA
- [ ] 3.2 Criar entidade `OutboxEvent` com factory method, métodos de estado e constante MAX_ATTEMPTS
- [ ] 3.3 Criar interface `RubricaRepository` (read-only: findAll, findBySigla)
- [ ] 3.4 Criar interfaces `OutboxEventWriter` e `OutboxEventRepository`
- [ ] 3.5 Escrever testes unitários para entidades

## Implementation Details

Referência: TechSpec seção "Interfaces Principais" e "Modelos de Dados — Entidade de Domínio".

Padrão equivalente ao .NET: `services/cadastro-api/3-Domain/Cadastro.Domain/Entities/OutboxEvent.cs`

### Relevant Files
- `services/cadastro-api/3-Domain/Cadastro.Domain/Entities/OutboxEvent.cs` — referência do OutboxEvent em .NET
- `services/cadastro-api/3-Domain/Cadastro.Domain/Interfaces/IOutboxEventWriter.cs` — referência da interface em .NET

### Dependent Files
- `services/arrecadacao-api/arrecadacao-infra/` — implementará as interfaces (task_04, task_05)
- `services/arrecadacao-api/arrecadacao-application/` — usará RubricaRepository via queries (task_06)

## Deliverables

- `Rubrica.java` em `arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/entities/`
- `OutboxEvent.java` em `arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/entities/`
- `RubricaRepository.java` em `arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/interfaces/`
- `OutboxEventWriter.java` e `OutboxEventRepository.java` em `arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/interfaces/`
- Unit tests with 80%+ coverage **(REQUIRED)**

## Tests

- Unit tests:
  - [ ] `Rubrica` — construtor cria instância com todos os campos corretos
  - [ ] `Rubrica` — construtor rejeita argumentos nulos (sigla, nome)
  - [ ] `OutboxEvent.criar()` — factory cria evento com id, type, subject, payload, createdAt preenchidos e publishedAt nulo
  - [ ] `OutboxEvent.marcarPublicado()` — seta publishedAt para instante atual
  - [ ] `OutboxEvent.incrementarTentativa()` — incrementa attempts em 1
  - [ ] `OutboxEvent.excedeuTentativas()` — retorna false com attempts < 10, true com attempts >= 10
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- `mvn clean test` no módulo domain passa sem erros
- Entidades Rubrica e OutboxEvent com comportamento correto validado por testes
- Interfaces de repositório definidas sem dependência de frameworks
- Cobertura >= 80% no módulo domain


## Task Files

- PRD directory: `/home/tsgomes/mcad/.compozy/tasks/seed-rubricas`
- Task file: `/home/tsgomes/mcad/.compozy/tasks/seed-rubricas/task_03.md`
- Master tasks file: `/home/tsgomes/mcad/.compozy/tasks/seed-rubricas/_tasks.md`
- Use these exact paths when `cy-execute-task` updates task tracking.
- Execute every explicit `Validation`, `Test Plan`, or `Testing` item from the task and supporting PRD docs.
- Update task checkboxes and task status only after implementation, verification evidence, and self-review are complete.
- Update the master tasks file only when the current task is actually complete.
- Keep tracking-only files out of automatic commits unless the repository explicitly requires them to be staged.
- Do not create an automatic commit for this run. Leave the diff ready for manual review.
