---
status: pending
domain: API
type: Feature Implementation
scope: Full
complexity: medium
dependencies:
  - task_03
---

# Task 06: Application layer — CQRS queries

## Overview

Implementar a camada de aplicação com o padrão CQRS type-safe: interfaces base (`Query`, `QueryHandler`, `QueryDispatcher`), queries `ListarRubricasQuery` e `BuscarRubricaPorSiglaQuery` com seus handlers, e o DTO `RubricaResponse`. Esta camada orquestra a lógica de consulta sem dependências de framework.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC section "Interfaces Principais" for exact signatures
- REFERENCE .NET CQRS pattern in services/cadastro-api/2-Application/Cadastro.Application/Common/CQRS/
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST criar interfaces CQRS base: `Query<R>`, `QueryHandler<Q, R>`, `Command<R>`, `CommandHandler<C, R>` (Command para features futuras)
- MUST criar `QueryDispatcher` que resolve handlers via Spring DI
- MUST criar `ListarRubricasQuery` (record sem parâmetros) e `ListarRubricasQueryHandler`
- MUST criar `BuscarRubricaPorSiglaQuery(String sigla)` e `BuscarRubricaPorSiglaQueryHandler`
- MUST criar `RubricaResponse` record com campos: id (UUID), sigla, nome, exigeClassificacao
- MUST lançar exception quando rubrica não encontrada por sigla (mapeável para 404)
- MUST manter módulo application sem dependências de framework (exceto Spring DI annotations)
</requirements>

## Subtasks

- [ ] 6.1 Criar interfaces CQRS base (Query, QueryHandler, Command, CommandHandler)
- [ ] 6.2 Criar `QueryDispatcher` com resolução via Spring ApplicationContext
- [ ] 6.3 Criar `ListarRubricasQuery` + `ListarRubricasQueryHandler`
- [ ] 6.4 Criar `BuscarRubricaPorSiglaQuery` + `BuscarRubricaPorSiglaQueryHandler`
- [ ] 6.5 Criar `RubricaResponse` record e exception para not found
- [ ] 6.6 Escrever testes unitários com mocks

## Implementation Details

Referência: TechSpec seção "Interfaces Principais" para assinaturas exatas.

Padrão .NET equivalente:
- `services/cadastro-api/2-Application/Cadastro.Application/Common/CQRS/` — IQuery, IQueryHandler, Dispatcher
- `services/cadastro-api/2-Application/Cadastro.Application/Common/Exceptions/` — NotFoundException

### Relevant Files
- `services/cadastro-api/2-Application/Cadastro.Application/Common/CQRS/IQuery.cs` — referência da interface Query
- `services/cadastro-api/2-Application/Cadastro.Application/Common/CQRS/IQueryHandler.cs` — referência do handler
- `services/cadastro-api/2-Application/Cadastro.Application/Common/CQRS/Dispatcher.cs` — referência do dispatcher
- `services/cadastro-api/2-Application/Cadastro.Application/Common/Exceptions/NotFoundException.cs` — referência de exception

### Dependent Files
- `services/arrecadacao-api/arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/interfaces/RubricaRepository.java` — interface do repositório (task_03)
- `services/arrecadacao-api/arrecadacao-api/src/main/java/br/com/ecad/arrecadacao/api/endpoints/RubricaController.java` — consumirá queries (task_07)

## Deliverables

- Interfaces CQRS base em `application/common/cqrs/`
- `QueryDispatcher.java` em `application/common/cqrs/`
- `ListarRubricasQuery.java`, `ListarRubricasQueryHandler.java` em `application/rubricas/queries/`
- `BuscarRubricaPorSiglaQuery.java`, `BuscarRubricaPorSiglaQueryHandler.java` em `application/rubricas/queries/`
- `RubricaResponse.java` em `application/rubricas/responses/`
- Exception para rubrica não encontrada em `application/common/exceptions/`
- Unit tests with 80%+ coverage **(REQUIRED)**

## Tests

- Unit tests (Mockito):
  - [ ] `ListarRubricasQueryHandler` — com repositório retornando 7 rubricas, handler retorna 7 `RubricaResponse` com dados mapeados
  - [ ] `ListarRubricasQueryHandler` — com repositório vazio, retorna lista vazia
  - [ ] `BuscarRubricaPorSiglaQueryHandler` — sigla "TV_ABERTA" existente retorna RubricaResponse correto
  - [ ] `BuscarRubricaPorSiglaQueryHandler` — sigla inexistente lança NotFoundException
  - [ ] `QueryDispatcher` — resolve e executa handler correto para query dada
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- Handlers retornam DTOs corretos a partir de dados do repositório
- NotFoundException lançada para sigla inexistente
- QueryDispatcher resolve handlers via DI
- Cobertura >= 80%
