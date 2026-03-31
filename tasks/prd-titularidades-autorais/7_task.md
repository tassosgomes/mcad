---
status: completed
parallelizable: false
blocked_by: ["6.0"]
---

<task_context>
<domain>backend/testing</domain>
<type>testing</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>database</dependencies>
<unblocks>""</unblocks>
</task_context>

# Tarefa 7.0: Testes Backend — Unitários + Integração

## Visão Geral

Testes unitários da entidade, handlers e autocomplete. Testes de integração dos 5 endpoints + verificação de proteção contra exclusão (F02/F03) + integração ISWC com titulares reais.

## Arquivos Envolvidos

- **Criar:**
  - `5-Tests/Cadastro.UnitTests/Titularidades/TitularidadeAutoralTests.cs`
  - `5-Tests/Cadastro.UnitTests/Titularidades/AdicionarTitularidadeHandlerTests.cs`
  - `5-Tests/Cadastro.UnitTests/Titularidades/EditarTitularidadeHandlerTests.cs`
  - `5-Tests/Cadastro.UnitTests/Titularidades/RemoverTitularidadeHandlerTests.cs`
  - `5-Tests/Cadastro.UnitTests/Titularidades/ListarTitularidadesHandlerTests.cs`
  - `5-Tests/Cadastro.UnitTests/Titularidades/BuscarTitularesHandlerTests.cs`
  - `5-Tests/Cadastro.IntegrationTests/TitularidadeEndpointsTests.cs`
- **Skills:** `dotnet-testing` — xUnit AAA, Moq, AwesomeAssertions, Testcontainers

## Subtarefas

- [ ] 7.1 TitularidadeAutoralTests: Criar ok, percentual 0 rejeita, percentual 101 rejeita, AlterarPercentual ok + inválido
- [ ] 7.2 AdicionarHandler: happy path, Editor+PF (422), duplicata (409), obra LIBERADA (409 DEPURACAO), obra DEPURADA (422), titular não encontrado (404)
- [ ] 7.3 EditarHandler: happy path, obra LIBERADA (409), titularidade não encontrada (404)
- [ ] 7.4 RemoverHandler: happy path, obra LIBERADA (409)
- [ ] 7.5 ListarHandler: lista com soma correta, obra sem titularidades (soma 0), somaCompleta true/false
- [ ] 7.6 BuscarTitularesHandler: busca por nome, busca por documento, sem resultados, q < 2 chars
- [ ] 7.7 Integração: POST adicionar → 201 com soma, POST Editor+PF → 422, POST duplicata → 409, POST obra LIBERADA → 409, GET listar → 200 com soma, PUT editar → 200, DELETE remover → 200 com body, GET busca autocomplete → 200
- [ ] 7.8 Integração cross-feature: DELETE /obras/{id} com titularidades → 409, DELETE /titulares/{id} com titularidades → 409
- [ ] 7.9 Integração ISWC: POST /obras/{id}/iswc com titulares reais → envia autores corretos

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet test` — todos os testes passam
- [ ] Mínimo 15 testes unitários
- [ ] Mínimo 10 testes de integração
