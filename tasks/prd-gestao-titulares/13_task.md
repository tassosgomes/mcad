---
status: pending
parallelizable: false
blocked_by: ["10.0"]
---

<task_context>
<domain>frontend/feature</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies></dependencies>
<unblocks>"14.0"</unblocks>
</task_context>

# Tarefa 13.0: Feature — Types + API + Hooks + Utils (CPF/CNPJ)

## Visão Geral

Criar a infraestrutura da feature Titulares: tipos TypeScript (derivados do API Contract), funções de API (CRUD), hooks TanStack Query (queries + mutations) e utils de validação/formatação CPF/CNPJ.

## Arquivos Envolvidos

- **Criar:**
  - `frontend/src/features/cadastro/titulares/types/titular.ts`
  - `frontend/src/features/cadastro/titulares/api/titularesApi.ts`
  - `frontend/src/features/cadastro/titulares/hooks/useTitulares.ts`
  - `frontend/src/features/cadastro/titulares/hooks/useTitular.ts`
  - `frontend/src/features/cadastro/titulares/hooks/useCreateTitular.ts`
  - `frontend/src/features/cadastro/titulares/hooks/useUpdateTitular.ts`
  - `frontend/src/features/cadastro/titulares/hooks/useDeleteTitular.ts`
  - `frontend/src/features/cadastro/titulares/utils/cpfValidator.ts`
  - `frontend/src/features/cadastro/titulares/utils/cnpjValidator.ts`
  - `frontend/src/features/cadastro/titulares/utils/documentFormatter.ts`
- **Referência:**
  - `tasks/prd-gestao-titulares/api-contract.yaml` — schemas
  - `docs/validacoes/cnpj.md` — algoritmo CNPJ
  - `frontend/src/features/cadastro/associacoes/` — padrão a seguir
- **Skills:** `react-architecture` — features, hooks

## Subtarefas

- [ ] 13.1 Criar tipos (Titular, TitularListResponse, Pagination, CriarTitularRequest, AtualizarTitularRequest, TitularFiltros)
- [ ] 13.2 Criar API functions (getTitulares com query params, getTitularById, criarTitular, atualizarTitular, excluirTitular)
- [ ] 13.3 Criar `useTitulares(filtros)` — useQuery com queryKey dinâmico, `keepPreviousData`
- [ ] 13.4 Criar `useTitular(id)` — useQuery por ID
- [ ] 13.5 Criar `useCreateTitular()` — useMutation + invalidate queries
- [ ] 13.6 Criar `useUpdateTitular()` — useMutation + invalidate queries
- [ ] 13.7 Criar `useDeleteTitular()` — useMutation + invalidate queries
- [ ] 13.8 Criar `cpfValidator.ts` — isValidCpf (módulo 11)
- [ ] 13.9 Criar `cnpjValidator.ts` — isValidCnpj (módulo 11 alfanumérico, ASCII-48)
- [ ] 13.10 Criar `documentFormatter.ts` — formatCpf, formatCnpj
- [ ] 13.11 Verificar: `npm run build`

## Detalhes de Implementação

### useTitulares — queryKey dinâmico
```typescript
export function useTitulares(filtros: TitularFiltros) {
  return useQuery({
    queryKey: ['titulares', filtros],
    queryFn: () => getTitulares(filtros),
    placeholderData: keepPreviousData,
  });
}
```

### Mutations invalidam cache
```typescript
onSuccess: () => queryClient.invalidateQueries({ queryKey: ['titulares'] })
```

## Critérios de Sucesso (Verificáveis)

- [ ] `npm run build` compila sem erros
- [ ] Tipos correspondem exatamente ao API Contract
- [ ] isValidCpf e isValidCnpj validam corretamente (mesma lógica do backend)
- [ ] formatCpf("12345678909") → "123.456.789-09"
- [ ] formatCnpj("12ABC34501DE99") → "12.ABC.345/01DE-99"
