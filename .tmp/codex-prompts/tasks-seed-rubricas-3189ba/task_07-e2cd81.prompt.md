# Implementation Task: task_07.md

## Task Context

- **Domain**: API
- **Type**: Feature Implementation
- **Scope**: Full
- **Complexity**: high
- **Dependencies**: task_04, task_05, task_06


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
- Current task memory: `/home/tsgomes/mcad/.compozy/tasks/seed-rubricas/memory/task_07.md`
- Use installed `cy-workflow-memory` before editing code and before finishing the task.
- Read both memory files before implementation. Promote durable cross-task context only to shared workflow memory.
- Keep task-local decisions, learnings, touched surfaces, and corrections in the current task memory file.


## Task Specification

---
status: pending
domain: API
type: Feature Implementation
scope: Full
complexity: high
dependencies:
  - task_04
  - task_05
  - task_06
---

# Task 07: API layer — Spring Boot app + RubricaController

## Overview

Integrar todas as camadas no módulo Spring Boot API: configurar segurança JWT/Keycloak, CORS, tratamento global de exceções (RFC 7807), registrar beans de infraestrutura, e implementar o `RubricaController` com endpoints GET (listagem + busca por sigla) e bloqueio 405 para verbos de escrita. Esta task é o fechamento que conecta domain, application e infra numa aplicação funcional.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC sections "Endpoints de API", "Configuração de Ambiente", "Decisões Arquiteturais"
- REFERENCE API Contract (api-contract.yaml) for exact response formats
- PRD requirements: RF-04, RF-10, RF-11, RF-12
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST configurar `SecurityConfig` com JWT Bearer via Keycloak (Spring Security OAuth2 Resource Server)
- MUST definir policies: ambas roles (`analista-arrecadacao`, `consultor-arrecadacao`) com acesso GET em rubricas
- MUST configurar CORS para `http://localhost:5173` (frontend)
- MUST implementar `GlobalExceptionHandler` com ProblemDetail RFC 7807 (NotFoundException → 404, etc.)
- MUST implementar `RubricaController` com GET `/api/v1/rubricas` retornando array de RubricaResponse
- MUST implementar GET `/api/v1/rubricas/{sigla}` retornando RubricaResponse ou 404
- MUST retornar 405 Method Not Allowed para POST, PUT, PATCH, DELETE em `/api/v1/rubricas/**` (RF-04, RF-12)
- MUST registrar todos os beans: repositories, outbox services, CQRS handlers/dispatcher
- MUST expor health checks via Actuator (`/actuator/health`) sem autenticação
- MUST aplicação iniciar na porta 5003
</requirements>

## Subtasks

- [ ] 7.1 Configurar `SecurityConfig` (JWT Keycloak, roles, health sem auth)
- [ ] 7.2 Configurar `CorsConfig` para frontend localhost:5173
- [ ] 7.3 Implementar `GlobalExceptionHandler` com ProblemDetail RFC 7807
- [ ] 7.4 Implementar `RubricaController` com GET listagem, GET por sigla, e bloqueio 405
- [ ] 7.5 Registrar beans de infraestrutura no `ArrecadacaoApplication` ou via `@Configuration`
- [ ] 7.6 Escrever testes de integração E2E com Testcontainers

## Implementation Details

Referência: TechSpec seções "Endpoints de API" e "Inventário de Artefatos" para lista completa de arquivos.

Referência de API Contract: `api-contract.yaml` para formato exato de responses e error bodies.

Padrão .NET equivalente:
- `services/cadastro-api/1-Services/Cadastro.API/Program.cs` — DI, middleware, auth
- `services/cadastro-api/1-Services/Cadastro.API/Infrastructure/GlobalExceptionHandler.cs` — exception mapping
- `services/cadastro-api/1-Services/Cadastro.API/Infrastructure/KeycloakClaimsTransformation.cs` — claims extraction

### Relevant Files
- `services/cadastro-api/1-Services/Cadastro.API/Program.cs` — referência de setup .NET
- `services/cadastro-api/1-Services/Cadastro.API/Infrastructure/GlobalExceptionHandler.cs` — referência de exception handler
- `services/cadastro-api/1-Services/Cadastro.API/Infrastructure/KeycloakClaimsTransformation.cs` — claims Keycloak
- `.compozy/tasks/seed-rubricas/api-contract.yaml` — contrato de API (fonte da verdade)

### Dependent Files
- `services/arrecadacao-api/arrecadacao-application/` — queries e handlers (task_06)
- `services/arrecadacao-api/arrecadacao-infra/` — repositórios e outbox (tasks 04, 05)
- `services/arrecadacao-api/arrecadacao-api/src/main/resources/application.yml` — configuração (task_02)

## Deliverables

- `SecurityConfig.java` em api/config/
- `CorsConfig.java` em api/config/
- `GlobalExceptionHandler.java` em api/config/ ou api/infrastructure/
- `RubricaController.java` em api/endpoints/
- Bean registration completa (scan ou @Configuration explícita)
- Integration tests E2E with Testcontainers **(REQUIRED)**

## Tests

- Integration tests (Spring Boot Test + Testcontainers PostgreSQL + RabbitMQ):
  - [ ] GET `/api/v1/rubricas` retorna 200 com array de 7 rubricas (id, sigla, nome, exigeClassificacao)
  - [ ] GET `/api/v1/rubricas/TV_ABERTA` retorna 200 com rubrica correta (exigeClassificacao = true)
  - [ ] GET `/api/v1/rubricas/INEXISTENTE` retorna 404 com ProblemDetails body
  - [ ] POST `/api/v1/rubricas` retorna 405 Method Not Allowed
  - [ ] PUT `/api/v1/rubricas/RADIO` retorna 405 Method Not Allowed
  - [ ] DELETE `/api/v1/rubricas/RADIO` retorna 405 Method Not Allowed
  - [ ] GET `/actuator/health` retorna 200 sem autenticação
  - [ ] Aplicação inicia na porta 5003 sem erros
  - [ ] Após startup, 7 eventos `arrecadacao.rubrica.criada` presentes na outbox (verificação E2E)
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- Aplicação Spring Boot inicia na porta 5003 sem erros
- 7 rubricas acessíveis via GET com dados corretos
- 405 retornado para todos os verbos de escrita
- ProblemDetails RFC 7807 em erros
- Health check acessível
- Eventos publicados no RabbitMQ após startup


## Task Files

- PRD directory: `/home/tsgomes/mcad/.compozy/tasks/seed-rubricas`
- Task file: `/home/tsgomes/mcad/.compozy/tasks/seed-rubricas/task_07.md`
- Master tasks file: `/home/tsgomes/mcad/.compozy/tasks/seed-rubricas/_tasks.md`
- Use these exact paths when `cy-execute-task` updates task tracking.
- Execute every explicit `Validation`, `Test Plan`, or `Testing` item from the task and supporting PRD docs.
- Update task checkboxes and task status only after implementation, verification evidence, and self-review are complete.
- Update the master tasks file only when the current task is actually complete.
- Keep tracking-only files out of automatic commits unless the repository explicitly requires them to be staged.
- Do not create an automatic commit for this run. Leave the diff ready for manual review.
