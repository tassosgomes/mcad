---
status: pending
parallelizable: true
blocked_by: []
---

<task_context>
<domain>identificacao/frontend</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>none</dependencies>
<unblocks>"8.0, 9.0"</unblocks>
</task_context>

# Tarefa 7.0: Frontend — Types, API Clients e Hooks

## Relacionada aos Requisitos

- RF-01 — useBuscaCadastro (autocomplete)
- RF-02 a RF-06 — hooks CRUD de execuções
- RF-03 — useCreateObraPendente, useCreateFonogramaPendente

## Visão Geral

Criar tipos TypeScript, funções de API e 8 hooks React Query para execuções, tipos de utilização e busca no Cadastro. Usa dois API clients: `apiIdentificacaoClient` (execuções) e `apiClient` (busca no Cadastro).

## Arquivos Envolvidos

- **Criar:**
  - `frontend/src/features/identificacao/captacoes/types/execucao.ts`
  - `frontend/src/features/identificacao/captacoes/api/execucoesApi.ts`
  - `frontend/src/features/identificacao/captacoes/api/buscaCadastroApi.ts`
  - `frontend/src/features/identificacao/captacoes/hooks/useExecucoes.ts`
  - `frontend/src/features/identificacao/captacoes/hooks/useCreateExecucao.ts`
  - `frontend/src/features/identificacao/captacoes/hooks/useUpdateExecucao.ts`
  - `frontend/src/features/identificacao/captacoes/hooks/useDeleteExecucao.ts`
  - `frontend/src/features/identificacao/captacoes/hooks/useTiposUtilizacao.ts`
  - `frontend/src/features/identificacao/captacoes/hooks/useBuscaCadastro.ts`
  - `frontend/src/features/identificacao/captacoes/hooks/useCreateObraPendente.ts`
  - `frontend/src/features/identificacao/captacoes/hooks/useCreateFonogramaPendente.ts`
- **Referência:**
  - `frontend/src/shared/services/apiClient.ts` (Cadastro :5001)
  - `frontend/src/shared/services/apiIdentificacaoClient.ts` (Identificação :5100)
  - `frontend/src/shared/hooks/useDebounce.ts`
  - `frontend/src/features/identificacao/captacoes/hooks/useRubricas.ts` (padrão cache longo)
  - `tasks/prd-registro-manual-execucoes/api-contract.yaml`

## Subtarefas

- [ ] 7.1 Criar `execucao.ts` com todas interfaces (Execucao, TipoUtilizacao, requests, responses, filtros, ResultadoBusca, ObraFonogramaSelecionado)
- [ ] 7.2 Criar `execucoesApi.ts` — getExecucoes, criarExecucao, atualizarExecucao, excluirExecucao, getTiposUtilizacao (via apiIdentificacaoClient)
- [ ] 7.3 Criar `buscaCadastroApi.ts` — buscarCadastro, criarObraPendente, criarFonogramaPendente (via apiClient original)
- [ ] 7.4 Criar `useTiposUtilizacao` — staleTime Infinity
- [ ] 7.5 Criar `useExecucoes` — queryKey com captacaoId + filtros, keepPreviousData
- [ ] 7.6 Criar `useCreateExecucao`, `useUpdateExecucao`, `useDeleteExecucao` — invalidam `['execucoes', captacaoId]` + `['captacoes', captacaoId]`
- [ ] 7.7 Criar `useBuscaCadastro` — debounce 300ms, enabled quando ≥ 3 chars, staleTime 30s
- [ ] 7.8 Criar `useCreateObraPendente` + `useCreateFonogramaPendente`

## Sequenciamento

- Bloqueado por: Nenhum (depende apenas do api-contract)
- Desbloqueia: 8.0, 9.0
- Paralelizável: Sim (paralelo com backend e mockups)

## Detalhes de Implementação

**Dois API clients — ponto crítico:**
```typescript
// execucoesApi.ts → usa apiIdentificacaoClient (porta 5100)
import { apiGet, apiPost, apiPut, apiDelete } from '@shared/services/apiIdentificacaoClient';

// buscaCadastroApi.ts → usa apiClient original (porta 5001)
import { apiGet, apiPost } from '@shared/services/apiClient';
```

**useBuscaCadastro — autocomplete:**
```typescript
export function useBuscaCadastro(termo: string, tipo?: string) {
  const debouncedTermo = useDebounce(termo, 300);
  return useQuery({
    queryKey: ['buscaCadastro', debouncedTermo, tipo],
    queryFn: () => buscarCadastro(debouncedTermo, tipo, 20),
    enabled: debouncedTermo.length >= 3,
    staleTime: 1000 * 30,
    select: (data) => data.resultados,
  });
}
```

**Invalidação cruzada nas mutations:**
```typescript
// Todas as mutations de execuções invalidam 2 queryKeys:
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['execucoes', captacaoId] });
  queryClient.invalidateQueries({ queryKey: ['captacoes', captacaoId] }); // atualiza resumo
},
```

## Critérios de Sucesso (Verificáveis)

- [ ] Build compila: `cd frontend && npm run build`
- [ ] TypeScript sem erros: `cd frontend && npx tsc --noEmit`
- [ ] 8 hooks criados
- [ ] `buscaCadastroApi` usa `apiClient` (:5001), `execucoesApi` usa `apiIdentificacaoClient` (:5100)
- [ ] `useBuscaCadastro` só busca com ≥ 3 chars
