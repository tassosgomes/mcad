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

# Tarefa 7.0: Testes Backend — Unitários (VO + Entidade + Handlers) + Integração

## Arquivos Envolvidos

- **Criar:**
  - `5-Tests/Cadastro.UnitTests/ValueObjects/IsrcTests.cs`
  - `5-Tests/Cadastro.UnitTests/Fonogramas/FonogramaTests.cs`
  - `5-Tests/Cadastro.UnitTests/Fonogramas/CriarFonogramaHandlerTests.cs`
  - `5-Tests/Cadastro.UnitTests/Fonogramas/AtualizarFonogramaHandlerTests.cs`
  - `5-Tests/Cadastro.UnitTests/Fonogramas/DepurarFonogramaHandlerTests.cs`
  - `5-Tests/Cadastro.UnitTests/Fonogramas/ExcluirFonogramaHandlerTests.cs`
  - `5-Tests/Cadastro.IntegrationTests/FonogramaEndpointsTests.cs`

## Subtarefas

- [x] 7.1 IsrcTests: formato válido, inválido, país não-letra, ano não-dígito, Formatado
- [x] 7.2 FonogramaTests: Criar (PENDENTE), Atualizar ok+DEPURADO rejeita, RequerDepuracao true/false, Depurar ok+não LIBERADO, PodeSerExcluido
- [x] 7.3 CriarHandler: happy path, ISRC inválido (422), ISRC duplicado (409), obra não existe (404)
- [x] 7.4 AtualizarHandler: PENDENTE+ISRC ok, LIBERADO+ISRC→409, LIBERADO+país ok, DEPURADO rejeita
- [x] 7.5 DepurarHandler: ok (original DEPURADO + novo PENDENTE mesma obra), status != LIBERADO
- [x] 7.6 ExcluirHandler: PENDENTE ok, LIBERADO rejeita, DEPURADO rejeita
- [x] 7.7 Integração: POST 201, POST ISRC dup 409, GET lista paginada, GET filtro ISRC, GET by ID 200+obra aninhada, PUT PENDENTE 200, PUT LIBERADO+ISRC 409, POST depurar 201, DELETE PENDENTE 204, DELETE LIBERADO 409, GET /obras/{id}/fonogramas 200 array, DELETE /obras/{id} com fonogramas 409

## Critérios de Sucesso (Verificáveis)

- [x] `dotnet test` — todos passam
- [x] Mínimo 15 unitários + 12 integração
