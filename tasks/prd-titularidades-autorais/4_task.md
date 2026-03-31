---
status: pending
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

# Tarefa 4.0: Application — Queries (ListarTitularidades, BuscarTitulares) + Responses

## Visão Geral

Criar queries CQRS: listar titularidades de uma obra (com soma calculada), e autocomplete de titulares (busca parcial nome/documento). DTOs de response incluindo `somaPercentual` e `somaCompleta`.

## Arquivos Envolvidos

- **Criar:**
  - `2-Application/.../Titularidades/Queries/ListarTitularidadesQuery.cs` + Handler
  - `2-Application/.../Titularidades/Queries/BuscarTitularesQuery.cs` + Handler
  - `2-Application/.../Titularidades/Responses/TitularidadesResponse.cs`
  - `2-Application/.../Titularidades/Responses/TitularidadeItemResponse.cs`
  - `2-Application/.../Titularidades/Responses/TitularResumoResponse.cs`
- **Referência:**
  - `tasks/prd-titularidades-autorais/api-contract.yaml` (schemas)
- **Skills:** `dotnet-architecture` — CQRS Queries

## Subtarefas

- [ ] 4.1 Criar `TitularidadesResponse` record (obraId, titularidades[], somaPercentual, somaCompleta)
- [ ] 4.2 Criar `TitularidadeItemResponse` record (id, titular, categoria, percentual)
- [ ] 4.3 Criar `TitularResumoResponse` record (id, nome, tipo, documentoFormatado, associacaoSigla)
- [ ] 4.4 Criar `ListarTitularidadesQuery(Guid ObraId)` + Handler — busca titularidades com Include Titular+Associacao, calcula soma, mapeia response
- [ ] 4.5 Criar `BuscarTitularesQuery(string Q, int Limit)` + Handler — busca por ILike nome ou Contains documento, top N, inclui associacaoSigla
- [ ] 4.6 Verificar build: `dotnet build`

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet build` compila sem erros
- [ ] ListarTitularidadesHandler retorna somaCompleta=true quando soma==100
- [ ] BuscarTitularesHandler retorna max `Limit` resultados
- [ ] BuscarTitulares com q < 2 chars retorna array vazio
