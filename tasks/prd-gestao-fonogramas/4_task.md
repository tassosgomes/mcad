---
status: completed
parallelizable: true
blocked_by: ["2.0"]
---

<task_context>
<domain>backend/application</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies></dependencies>
<unblocks>"6.0"</unblocks>
</task_context>

# Tarefa 4.0: Application — Queries (Listar, GetById, ListarPorObra) + Responses

## Visão Geral

3 queries CQRS + 4 DTOs de response. ListarPorObra retorna array direto (sem paginação). FonogramaResponse inclui `isrcFormatado` (via VO) e `obra` aninhada.

## Arquivos Envolvidos

- **Criar:**
  - `2-Application/.../Fonogramas/Queries/ListarFonogramasQuery.cs` + Handler
  - `2-Application/.../Fonogramas/Queries/GetFonogramaByIdQuery.cs` + Handler
  - `2-Application/.../Fonogramas/Queries/ListarFonogramasPorObraQuery.cs` + Handler
  - `2-Application/.../Fonogramas/Responses/FonogramaResponse.cs`
  - `2-Application/.../Fonogramas/Responses/FonogramaResumoResponse.cs`
  - `2-Application/.../Fonogramas/Responses/FonogramaListResponse.cs`
  - `2-Application/.../Fonogramas/Responses/DepuracaoFonogramaResponse.cs`
  - `2-Application/.../Fonogramas/Responses/ObraResumoResponse.cs` (se não existir já)
- **Referência:**
  - `tasks/prd-gestao-fonogramas/api-contract.yaml` (schemas)
- **Skills:** `dotnet-architecture` — CQRS Queries

## Subtarefas

- [x] 4.1 Criar `FonogramaResponse` record (id, isrc, isrcFormatado, obra, paisOrigem, dataGravacao, dataLancamento, status, fonogramaDepuradoParaId, criadoEm, atualizadoEm). `isrcFormatado` via `fonograma.Isrc.Formatado`.
- [x] 4.2 Criar `FonogramaResumoResponse` (id, isrcFormatado, status, paisOrigem, dataLancamento)
- [x] 4.3 Criar `FonogramaListResponse` e `DepuracaoFonogramaResponse`
- [x] 4.4 Criar `ListarFonogramasQuery` + Handler (paginação + filtros + Include Obra)
- [x] 4.5 Criar `GetFonogramaByIdQuery` + Handler (Include Obra, NotFoundException)
- [x] 4.6 Criar `ListarFonogramasPorObraQuery(Guid ObraId)` + Handler (array direto, sem paginação)
- [x] 4.7 Verificar build: `dotnet build`

## Critérios de Sucesso (Verificáveis)

- [x] `dotnet build` compila sem erros
- [x] FonogramaResponse inclui isrcFormatado e obra aninhada
- [x] ListarPorObra retorna array sem wrapper de paginação
