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
<unblocks>"8.0, 9.0"</unblocks>
</task_context>

# Tarefa 7.0: Frontend — Types, API Client e Hooks

## Relacionada aos Requisitos

- RF-01 a RF-05 — hooks de mutação e query para todos os endpoints

## Visão Geral

Criar os tipos TypeScript derivados do api-contract.yaml, o API client para o serviço de Identificação (porta separada), as funções de chamada HTTP e os 6 hooks React Query. Esta task pode iniciar em paralelo com o backend pois depende apenas do contrato.

## Arquivos Envolvidos

- **Criar:**
  - `frontend/src/features/identificacao/captacoes/types/captacao.ts`
  - `frontend/src/shared/services/apiIdentificacaoClient.ts`
  - `frontend/src/features/identificacao/captacoes/api/captacoesApi.ts`
  - `frontend/src/features/identificacao/captacoes/hooks/useRubricas.ts`
  - `frontend/src/features/identificacao/captacoes/hooks/useCaptacoes.ts`
  - `frontend/src/features/identificacao/captacoes/hooks/useCaptacao.ts`
  - `frontend/src/features/identificacao/captacoes/hooks/useCreateCaptacao.ts`
  - `frontend/src/features/identificacao/captacoes/hooks/useUpdateCaptacao.ts`
  - `frontend/src/features/identificacao/captacoes/hooks/useDeleteCaptacao.ts`
- **Referência:**
  - `frontend/src/shared/services/apiClient.ts` (base para apiIdentificacaoClient)
  - `frontend/src/features/cadastro/obras/types/obra.ts` (padrão de tipos)
  - `frontend/src/features/cadastro/obras/api/obrasApi.ts` (padrão de API layer)
  - `frontend/src/features/cadastro/obras/hooks/useObras.ts` (padrão de query hook)
  - `frontend/src/features/cadastro/obras/hooks/useCreateObra.ts` (padrão de mutation hook)
  - `tasks/prd-gestao-captacoes/api-contract.yaml` (fonte de verdade dos tipos)

## Subtarefas

- [x] 7.1 Criar `captacao.ts` com todas as interfaces TypeScript (Rubrica, Captacao, CaptacaoDetalhe, requests, responses, filtros)
- [x] 7.2 Criar `apiIdentificacaoClient.ts` — reutiliza lógica de auth do apiClient mas aponta para `VITE_IDENTIFICACAO_API_BASE_URL`
- [x] 7.3 Criar `captacoesApi.ts` com funções: getRubricas, getCaptacoes, getCaptacaoById, criarCaptacao, atualizarCaptacao, excluirCaptacao
- [x] 7.4 Criar `useRubricas.ts` — staleTime Infinity, gcTime 1h, select para extrair array
- [x] 7.5 Criar `useCaptacoes.ts` — queryKey com filtros, keepPreviousData
- [x] 7.6 Criar `useCaptacao.ts` — enabled: !!id
- [x] 7.7 Criar `useCreateCaptacao.ts` — invalidate ['captacoes'] on success
- [x] 7.8 Criar `useUpdateCaptacao.ts` — setQueryData + invalidate on success
- [x] 7.9 Criar `useDeleteCaptacao.ts` — invalidate ['captacoes'] on success

## Sequenciamento

- Bloqueado por: Nenhum (depende apenas do api-contract.yaml)
- Desbloqueia: 8.0, 9.0
- Paralelizável: Sim (independente do backend e dos mockups)

## Detalhes de Implementação

**apiIdentificacaoClient.ts:**
```typescript
const BASE_URL = import.meta.env.VITE_IDENTIFICACAO_API_BASE_URL || 'http://localhost:5100/api/v1';

// Reutilizar mesma lógica de fetchWithAuth, handleError
// Exportar: apiGet, apiPost, apiPut, apiDelete com tipos genéricos
```

**captacoesApi.ts — padrão de filtros em query params:**
```typescript
export function getCaptacoes(filtros: CaptacaoFiltros): Promise<CaptacaoListResponse> {
  const params = new URLSearchParams();
  params.set('page', String(filtros.page));
  params.set('size', String(filtros.size));
  if (filtros.sort) params.set('sort', filtros.sort);
  if (filtros.rubricaId) params.set('rubricaId', filtros.rubricaId);
  if (filtros.periodoInicio) params.set('periodoInicio', filtros.periodoInicio);
  if (filtros.periodoFim) params.set('periodoFim', filtros.periodoFim);
  if (filtros.status) params.set('status', filtros.status);
  if (filtros.analistaResponsavelId) params.set('analistaResponsavelId', filtros.analistaResponsavelId);
  return apiGet<CaptacaoListResponse>(`/captacoes?${params}`);
}
```

**useRubricas — cache longo:**
```typescript
export function useRubricas() {
  return useQuery({
    queryKey: ['rubricas'],
    queryFn: getRubricas,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60,
    select: (data) => data.data,
  });
}
```

**Convenções:**
- Um hook por arquivo (single responsibility)
- Hooks de mutation sempre invalidam queries de lista no onSuccess
- useUpdateCaptacao usa setQueryData para optimistic update do detalhe
- Erros são thrown como ProblemDetails objects (tratados nos pages)
- queryKey segue padrão: `['recurso']` para lista, `['recurso', id]` para detalhe

## Critérios de Sucesso (Verificáveis)

- [x] Build compila: `cd frontend && npm run build`
- [x] TypeScript sem erros: `cd frontend && npx tsc --noEmit`
- [x] Tipos cobrem todos os schemas do api-contract.yaml
- [x] 6 hooks criados com queryKeys corretas
- [x] apiIdentificacaoClient aponta para variável de ambiente separada
