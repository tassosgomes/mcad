---
status: pending
parallelizable: true
blocked_by: []
---

<task_context>
<domain>distribuicao/frontend</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>http_server</dependencies>
<unblocks>"8.0"</unblocks>
</task_context>

# Tarefa 7.0: Frontend — tipos, API client, hooks

## Relacionada às User Stories

- [HU-03] Listar e filtrar processos (suporte — data layer)
- [HU-04] Visualizar detalhes (suporte — data layer)

## Visão Geral

Criar a camada de dados do frontend: tipos TypeScript (do api-contract.yaml), extensão do API client com POST, funções de API, e hooks TanStack Query (queries + mutations). Pode ser desenvolvido em paralelo com o backend usando mock server.

## Arquivos Envolvidos

- **Criar:**
  - `frontend/src/features/distribuicao/processos/types/processo.ts`
  - `frontend/src/features/distribuicao/processos/api/processosApi.ts`
  - `frontend/src/features/distribuicao/processos/hooks/useProcessos.ts`
  - `frontend/src/features/distribuicao/processos/hooks/useProcesso.ts`
  - `frontend/src/features/distribuicao/processos/hooks/useDisponiveis.ts`
  - `frontend/src/features/distribuicao/processos/hooks/useProcessoMutations.ts`
  - `frontend/src/features/distribuicao/processos/index.ts`
- **Modificar:**
  - `frontend/src/shared/services/apiDistribuicaoClient.ts` (adicionar `apiPostDist`)
- **Referência:**
  - `tasks/distribuicao/prd-gestao-processos/api-contract.yaml` (fonte de verdade para tipos)
  - `frontend/src/features/arrecadacao/pagamentos/hooks/` (padrão de hooks com paginação)
  - `frontend/src/features/arrecadacao/pagamentos/api/pagamentosApi.ts` (padrão de API)
  - `tasks/distribuicao/prd-gestao-processos/techspec-frontend.md` (design completo)

## Subtarefas

- [ ] 7.1 Adicionar `apiPostDist<T>(path, body)` ao apiDistribuicaoClient.ts
- [ ] 7.2 Criar `processo.ts` com todas as interfaces (Processo, StatusProcesso, ProcessoListResponse, etc.)
- [ ] 7.3 Criar `processosApi.ts` com 8 funções fetch
- [ ] 7.4 Criar `useProcessos.ts` (listagem paginada com keepPreviousData)
- [ ] 7.5 Criar `useProcesso.ts` (detalhe por ID)
- [ ] 7.6 Criar `useDisponiveis.ts` (combinações disponíveis)
- [ ] 7.7 Criar `useProcessoMutations.ts` (5 mutations com invalidação)
- [ ] 7.8 Criar `index.ts` (barrel exports)
- [ ] 7.9 Verificar: `cd frontend && npx tsc --noEmit`

## Sequenciamento

- Bloqueado por: Nenhum (pode usar mock server)
- Desbloqueia: 8.0
- Paralelizável: Sim (paralelo com todo o backend)

## Detalhes de Implementação

Ver techspec-frontend.md para código completo de cada arquivo. Pontos-chave:

- `apiPostDist` segue o padrão de `apiGetDist` mas com method POST e body serializado
- Todas as mutations invalidam tanto a query de lista quanto a de detalhe
- `useProcessos` usa `keepPreviousData: true` para evitar flash ao paginar
- Query keys seguem padrão: `['distribuicao', 'processos', ...params]`

## Critérios de Sucesso (Verificáveis)

- [ ] TypeScript compila: `cd frontend && npx tsc --noEmit`
- [ ] `apiPostDist` existe no apiDistribuicaoClient.ts
- [ ] 8 funções de API no processosApi.ts
- [ ] 4 hooks de query + 1 arquivo com 5 mutations
- [ ] Barrel export funcional
