---
status: completed
parallelizable: true
blocked_by: []
---

<task_context>
<domain>identificacao/frontend</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>none</dependencies>
<unblocks>"7.0, 8.0"</unblocks>
</task_context>

# Tarefa 6.0: Frontend — Types, API Client e Hooks

## Visão Geral

Criar tipos TypeScript, funções de API e 4 hooks React Query para a tela de pendentes. Invalidação cruzada com queries de execuções e captações.

## Arquivos Envolvidos

- **Criar:**
  - `frontend/src/features/identificacao/pendentes/types/pendente.ts`
  - `frontend/src/features/identificacao/pendentes/api/pendentesApi.ts`
  - `frontend/src/features/identificacao/pendentes/hooks/usePendentes.ts`
  - `frontend/src/features/identificacao/pendentes/hooks/useImpactoPendentes.ts`
  - `frontend/src/features/identificacao/pendentes/hooks/useResolverPendente.ts`
  - `frontend/src/features/identificacao/pendentes/hooks/useResolverPendentesEmLote.ts`
- **Referência:**
  - `frontend/src/shared/services/apiIdentificacaoClient.ts`
  - `frontend/src/features/identificacao/captacoes/hooks/useExecucoes.ts` (padrão)
  - `tasks/prd-identificacao-execucoes/api-contract.yaml`

## Subtarefas

- [x] 6.1 Criar `pendente.ts` com todas interfaces (ExecucaoPendente, ImpactoPendente, requests, responses, filtros)
- [x] 6.2 Criar `pendentesApi.ts` — getPendentes, getImpactoPendentes, resolverPendente, resolverPendentesEmLote
- [x] 6.3 Criar `usePendentes` — queryKey com filtros, keepPreviousData
- [x] 6.4 Criar `useImpactoPendentes` — queryKey com sort+page
- [x] 6.5 Criar `useResolverPendente` — invalidate pendentes + execucoes + captacoes
- [x] 6.6 Criar `useResolverPendentesEmLote` — invalidate pendentes + execucoes + captacoes

## Sequenciamento

- Bloqueado por: Nenhum (depende do api-contract)
- Desbloqueia: 7.0, 8.0
- Paralelizável: Sim

## Critérios de Sucesso (Verificáveis)

- [x] Build: `cd frontend && npm run build`
- [x] TypeScript: `cd frontend && npx tsc --noEmit`
- [x] 4 hooks criados
- [x] Mutations invalidam 3 queryKeys (pendentes, execucoes, captacoes)
