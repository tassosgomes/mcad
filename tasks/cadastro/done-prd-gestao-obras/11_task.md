---
status: done
parallelizable: true
blocked_by: []
---

<task_context>
<domain>frontend/feature</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies></dependencies>
<unblocks>"12.0, 13.0"</unblocks>
</task_context>

# Tarefa 11.0: Feature — Types + API (8 funções) + Hooks (8 hooks)

## Visão Geral

Criar a infraestrutura da feature Obras: tipos TypeScript (derivados do API Contract), 8 funções de API (CRUD + iswc + depurar + DP) e 8 hooks TanStack Query.

## Arquivos Envolvidos

- **Criar:**
  - `frontend/src/features/cadastro/obras/types/obra.ts`
  - `frontend/src/features/cadastro/obras/api/obrasApi.ts`
  - `frontend/src/features/cadastro/obras/hooks/useObras.ts`
  - `frontend/src/features/cadastro/obras/hooks/useObra.ts`
  - `frontend/src/features/cadastro/obras/hooks/useCreateObra.ts`
  - `frontend/src/features/cadastro/obras/hooks/useUpdateObra.ts`
  - `frontend/src/features/cadastro/obras/hooks/useDeleteObra.ts`
  - `frontend/src/features/cadastro/obras/hooks/useObterIswc.ts`
  - `frontend/src/features/cadastro/obras/hooks/useDepurarObra.ts`
  - `frontend/src/features/cadastro/obras/hooks/useDominioPublico.ts`
- **Referência:**
  - `tasks/prd-gestao-obras/api-contract.yaml`
  - `frontend/src/features/cadastro/titulares/` (padrão)
- **Skills:** `react-architecture`

## Subtarefas

- [ ] 11.1 Criar tipos (ObraMusical, ObraListResponse, CriarObraRequest, AtualizarObraRequest, DepurarObraRequest, DepuracaoResponse, DominioPublicoRequest, ObraFiltros)
- [ ] 11.2 Criar 8 API functions em obrasApi.ts
- [ ] 11.3 Criar useObras (query paginada com keepPreviousData)
- [ ] 11.4 Criar useObra (query by ID)
- [ ] 11.5 Criar useCreateObra, useUpdateObra, useDeleteObra (mutations padrão)
- [ ] 11.6 Criar useObterIswc (mutation → setQueryData no cache da obra individual)
- [ ] 11.7 Criar useDepurarObra (mutation → invalidate queries)
- [ ] 11.8 Criar useDominioPublico (mutation → setQueryData + invalidate lista)
- [ ] 11.9 Verificar: `npm run build`

## Critérios de Sucesso (Verificáveis)

- [ ] `npm run build` compila sem erros
- [ ] Tipos correspondem ao API Contract
- [ ] 8 hooks exportados e funcionais
- [ ] obterIswc envia POST sem body (apenas obraId no path)
- [ ] depurarObra envia POST com body (DepurarObraRequest)
