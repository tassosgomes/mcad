---
status: done
parallelizable: false
blocked_by: ["5.0", "6.0", "7.0"]
---

<task_context>
<domain>backend/api+testing</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>database</dependencies>
<unblocks>""</unblocks>
</task_context>

# Tarefa 8.0: API — StatusEndpoints (8 endpoints) + Program.cs + GlobalExceptionHandler + Testes

## Visão Geral

8 endpoints de status (3 obra + 3 fonograma + 2 histórico), registro DI, PreRequisitosException → 422 com pendencias[] no GlobalExceptionHandler. Testes unitários (validadores + entidades + handlers) + integração (todos endpoints).

## Arquivos Envolvidos

- **Criar:**
  - `services/cadastro-api/1-Services/Cadastro.API/Endpoints/StatusEndpoints.cs`
  - `5-Tests/Cadastro.UnitTests/Status/ValidadorLiberacaoObraTests.cs`
  - `5-Tests/Cadastro.UnitTests/Status/ValidadorLiberacaoFonogramaTests.cs`
  - `5-Tests/Cadastro.UnitTests/Status/LiberarObraHandlerTests.cs`
  - `5-Tests/Cadastro.UnitTests/Status/BloquearObraHandlerTests.cs`
  - `5-Tests/Cadastro.UnitTests/Status/LiberarFonogramaHandlerTests.cs`
  - `5-Tests/Cadastro.UnitTests/Status/BloquearFonogramaHandlerTests.cs`
  - `5-Tests/Cadastro.IntegrationTests/StatusEndpointsTests.cs`
- **Modificar:**
  - `services/cadastro-api/1-Services/Cadastro.API/Program.cs` — registrar IHistoricoBloqueioRepository, MapStatusEndpoints()
  - `services/cadastro-api/1-Services/Cadastro.API/Infrastructure/GlobalExceptionHandler.cs` — PreRequisitosException → 422 com `pendencias[]` no ProblemDetails extensions

## Subtarefas

- [x] 8.1 StatusEndpoints: POST /obras/{id}/liberar, /bloquear, /desbloquear; POST /fonogramas/{id}/liberar, /bloquear, /desbloquear; GET /obras/{id}/historico-bloqueios, GET /fonogramas/{id}/historico-bloqueios
- [x] 8.2 GlobalExceptionHandler: PreRequisitosException → 422 com `Extensions["pendencias"] = exception.Pendencias`
- [x] 8.3 Program.cs: +IHistoricoBloqueioRepository, +MapStatusEndpoints()
- [x] 8.4 **Testes unitários validadores:** obra completa=todos ok, sem ISWC, soma 80%, fono completo, obra PENDENTE, sem áudio
- [x] 8.5 **Testes unitários entidades:** Liberar/Bloquear/Desbloquear ok + status inválido para obra e fonograma
- [x] 8.6 **Testes unitários handlers:** LiberarObra sucesso + pendências, BloquearObra + justificativa curta, LiberarFonograma + obra PENDENTE
- [x] 8.7 **Integração:** POST /liberar obra completa → 200, POST /liberar sem ISWC → 422 com pendencias, POST /bloquear → 200 + justificativa, POST /desbloquear → 200 PENDENTE, POST /liberar fonograma obra PENDENTE → 422, GET /historico → array

## Critérios de Sucesso (Verificáveis)

- [x] `dotnet test` — todos passam
- [x] POST /obras/{id}/liberar com obra completa → 200 status=LIBERADO
- [x] POST /obras/{id}/liberar sem ISWC → 422 com pendencias[ISWC=false]
- [x] POST /obras/{id}/bloquear → 200 status=BLOQUEADO + bloqueioJustificativa
- [x] POST /fonogramas/{id}/liberar com obra PENDENTE → 422 pendencias[Obra=false]
- [x] GET /historico-bloqueios → array ordenado
- [x] Mínimo 12 testes unitários + 8 integração
