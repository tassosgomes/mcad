---
status: done
parallelizable: false
blocked_by: ["7.0"]
---

<task_context>
<domain>backend/testing</domain>
<type>testing</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>database</dependencies>
<unblocks>""</unblocks>
</task_context>

# Tarefa 8.0: Testes Backend — Unitários (VOs, Handlers) + Integração (Endpoints)

## Visão Geral

Testes unitários dos Value Objects (CPF, CNPJ, CaeIpi), Command Handlers e Query Handlers. Testes de integração de todos os endpoints via WebApplicationFactory + Testcontainers.

## Arquivos Envolvidos

- **Criar:**
  - `services/cadastro-api/5-Tests/Cadastro.UnitTests/ValueObjects/CpfTests.cs`
  - `services/cadastro-api/5-Tests/Cadastro.UnitTests/ValueObjects/CnpjTests.cs`
  - `services/cadastro-api/5-Tests/Cadastro.UnitTests/ValueObjects/CaeIpiTests.cs`
  - `services/cadastro-api/5-Tests/Cadastro.UnitTests/Titulares/CriarTitularCommandHandlerTests.cs`
  - `services/cadastro-api/5-Tests/Cadastro.UnitTests/Titulares/AtualizarTitularCommandHandlerTests.cs`
  - `services/cadastro-api/5-Tests/Cadastro.UnitTests/Titulares/ExcluirTitularCommandHandlerTests.cs`
  - `services/cadastro-api/5-Tests/Cadastro.UnitTests/Titulares/ListarTitularesQueryHandlerTests.cs`
  - `services/cadastro-api/5-Tests/Cadastro.IntegrationTests/TitularEndpointsTests.cs`
- **Referência:**
  - `services/cadastro-api/5-Tests/Cadastro.UnitTests/Associacoes/` — padrão AAA a seguir
  - `services/cadastro-api/5-Tests/Cadastro.IntegrationTests/Fixtures/CadastroApiFactory.cs` — fixture existente
- **Skills:** `dotnet-testing` — xUnit, AAA, Moq, AwesomeAssertions, Testcontainers

## Subtarefas

- [ ] 8.1 CpfTests: válido, inválido, formatação, com máscara (limpa), todos zeros rejeitados
- [ ] 8.2 CnpjTests: numérico válido, alfanumérico válido, inválido, DVs não-numéricos, formatação
- [ ] 8.3 CaeIpiTests: válido, vazio, excede 20 chars
- [ ] 8.4 CriarTitularCommandHandlerTests: happy path PF, happy path PJ, documento duplicado (ConflictException), CPF inválido (DomainException), associação inexistente (NotFoundException)
- [ ] 8.5 AtualizarTitularCommandHandlerTests: happy path, não encontrado
- [ ] 8.6 ExcluirTitularCommandHandlerTests: happy path, com vínculos (ConflictException), não encontrado
- [ ] 8.7 ListarTitularesQueryHandlerTests: retorna paginado, filtro por nome, lista vazia
- [ ] 8.8 TitularEndpointsTests (integração): POST 201, POST 409 duplicado, POST 422 CPF inválido, GET lista paginada, GET filtro nome, GET by ID 200, GET by ID 404, PUT 200, DELETE 204

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet test services/cadastro-api/Cadastro.sln` — todos os testes passam
- [ ] Mínimo 10 testes unitários (3 VOs + 7 handlers)
- [ ] Mínimo 8 testes de integração
- [ ] Testes de integração usam Testcontainers (sem dependência de banco externo)
