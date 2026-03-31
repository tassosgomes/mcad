---
status: completed
parallelizable: true
blocked_by: []
---

<task_context>
<domain>frontend/feature</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies></dependencies>
<unblocks>"11.0"</unblocks>
</task_context>

# Tarefa 10.0: Feature — Types + API (5 funções) + Hooks (5 hooks)

## Visão Geral

Criar tipos, funções de API e hooks TanStack Query para titularidades. Mutations usam `setQueryData` para update instantâneo do cache (response retorna lista completa com soma).

## Arquivos Envolvidos

- **Criar:**
  - `frontend/src/features/cadastro/titularidades/types/titularidade.ts`
  - `frontend/src/features/cadastro/titularidades/api/titularidadesApi.ts`
  - `frontend/src/features/cadastro/titularidades/hooks/useTitularidades.ts`
  - `frontend/src/features/cadastro/titularidades/hooks/useAddTitularidade.ts`
  - `frontend/src/features/cadastro/titularidades/hooks/useEditTitularidade.ts`
  - `frontend/src/features/cadastro/titularidades/hooks/useRemoveTitularidade.ts`
  - `frontend/src/features/cadastro/titularidades/hooks/useBuscarTitulares.ts`
- **Referência:**
  - `tasks/prd-titularidades-autorais/api-contract.yaml` (schemas)
  - `tasks/prd-titularidades-autorais/techspec-frontend.md` (seção "Hooks")
- **Skills:** `react-architecture`

## Subtarefas

- [ ] 10.1 Criar tipos (TitularidadeItem, TitularResumo, TitularidadesResponse, AdicionarRequest, EditarRequest)
- [ ] 10.2 Criar API functions: getTitularidades, adicionarTitularidade, editarTitularidade, removerTitularidade (apiDeleteWithBody), buscarTitulares
- [ ] 10.3 Criar useTitularidades(obraId) — query
- [ ] 10.4 Criar useAddTitularidade(obraId), useEditTitularidade(obraId), useRemoveTitularidade(obraId) — mutations com setQueryData
- [ ] 10.5 Criar useBuscarTitulares(query) — query com useDebounce, enabled se >= 2 chars
- [ ] 10.6 Verificar: `npm run build`

## Critérios de Sucesso (Verificáveis)

- [ ] `npm run build` compila sem erros
- [ ] Tipos correspondem ao API Contract
- [ ] Mutations atualizam cache via setQueryData (sem refetch)
- [ ] useBuscarTitulares só busca com >= 2 chars
