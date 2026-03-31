---
status: completed
parallelizable: false
blocked_by: ["7.0"]
---

<task_context>
<domain>backend/testing</domain>
<type>testing</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies></dependencies>
<unblocks>"9.0"</unblocks>
</task_context>

# Tarefa 8.0: Testes Unitários — Entidade + Handlers + IswcService

## Visão Geral

Testes unitários da entidade ObraMusical (6 métodos de negócio), command handlers (CRUD + especiais) e mock do IswcService.

## Arquivos Envolvidos

- **Criar:**
  - `5-Tests/Cadastro.UnitTests/Obras/ObraMusicalTests.cs`
  - `5-Tests/Cadastro.UnitTests/Obras/CriarObraCommandHandlerTests.cs`
  - `5-Tests/Cadastro.UnitTests/Obras/AtualizarObraCommandHandlerTests.cs`
  - `5-Tests/Cadastro.UnitTests/Obras/ExcluirObraCommandHandlerTests.cs`
  - `5-Tests/Cadastro.UnitTests/Obras/ObterIswcCommandHandlerTests.cs`
  - `5-Tests/Cadastro.UnitTests/Obras/DepurarObraCommandHandlerTests.cs`
  - `5-Tests/Cadastro.UnitTests/Obras/AlterarDominioPublicoCommandHandlerTests.cs`
- **Skills:** `dotnet-testing` — xUnit AAA, Moq, AwesomeAssertions

## Subtarefas

- [ ] 8.1 ObraMusicalTests: Criar (PENDENTE), Atualizar (ok + DEPURADA rejeita), AtribuirIswc (ok + já tem + não PENDENTE), Depurar (ok + não LIBERADO), MarcarDP (ok + DEPURADA rejeita), RequerDepuracao (true + false)
- [ ] 8.2 CriarObraCommandHandlerTests: happy path
- [ ] 8.3 AtualizarObraCommandHandlerTests: PENDENTE ok, LIBERADO título diferente → DepuracaoNecessariaException, LIBERADO gênero diferente → ok, DEPURADA → DomainException
- [ ] 8.4 ObterIswcCommandHandlerTests: sucesso (mock IswcService), sem titulares → 422, API falha → ExternalServiceException, ISWC duplicado → ConflictException
- [ ] 8.5 DepurarObraCommandHandlerTests: ok (original DEPURADA + nova PENDENTE), status != LIBERADO → DomainException
- [ ] 8.6 ExcluirObraCommandHandlerTests: ok, vínculos → ConflictException, DEPURADA → ConflictException
- [ ] 8.7 AlterarDPTests: marcar → DOMINIO_PUBLICO, desmarcar → volta status anterior

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet test --filter "Namespace~Obras"` — todos passam
- [ ] Mínimo 20 testes unitários cobrindo todos os cenários
