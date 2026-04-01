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
<unblocks>"10.0, 11.0, 12.0, 13.0"</unblocks>
</task_context>

# Tarefa 9.0: Feature — Utils + Types + API (7 funções) + Hooks (7 hooks)

## Visão Geral

Infraestrutura da feature: validação/formatação ISRC (utils), tipos TypeScript, 7 API functions e 7 hooks TanStack Query. `useFonogramasDaObra` é separado (sem paginação).

## Arquivos Envolvidos

- **Criar:**
  - `frontend/src/features/cadastro/fonogramas/utils/isrcValidator.ts`
  - `frontend/src/features/cadastro/fonogramas/utils/isrcFormatter.ts`
  - `frontend/src/features/cadastro/fonogramas/types/fonograma.ts`
  - `frontend/src/features/cadastro/fonogramas/api/fonogramasApi.ts`
  - `frontend/src/features/cadastro/fonogramas/hooks/useFonogramas.ts`
  - `frontend/src/features/cadastro/fonogramas/hooks/useFonograma.ts`
  - `frontend/src/features/cadastro/fonogramas/hooks/useFonogramasDaObra.ts`
  - `frontend/src/features/cadastro/fonogramas/hooks/useCreateFonograma.ts`
  - `frontend/src/features/cadastro/fonogramas/hooks/useUpdateFonograma.ts`
  - `frontend/src/features/cadastro/fonogramas/hooks/useDeleteFonograma.ts`
  - `frontend/src/features/cadastro/fonogramas/hooks/useDepurarFonograma.ts`
- **Referência:**
  - `tasks/prd-gestao-fonogramas/api-contract.yaml`
  - `features/cadastro/obras/hooks/` (padrão)

## Subtarefas

- [x] 9.1 isrcValidator: `isValidIsrc(isrc)` — regex `^[A-Z]{2}[A-Z0-9]{3}\d{7}$`
- [x] 9.2 isrcFormatter: `formatIsrc("BRABC2312345")` → `"BR-ABC-23-12345"`
- [x] 9.3 Types (Fonograma, FonogramaResumo, ObraResumo, requests, responses, filtros)
- [x] 9.4 API functions (7): getFonogramas, getFonogramaById, getFonogramasDaObra, criarFonograma, atualizarFonograma, excluirFonograma, depurarFonograma
- [x] 9.5 Hooks (7): useFonogramas (paginado), useFonograma (byId), useFonogramasDaObra (array), useCreate, useUpdate, useDelete, useDepurar. Mutations invalidam `['fonogramas']` e `['fonogramas-obra']`.
- [x] 9.6 Verificar: `npm run build`

## Critérios de Sucesso (Verificáveis)

- [x] `npm run build` compila sem erros
- [x] isValidIsrc("BRABC2312345") → true
- [x] isValidIsrc("INVALIDO") → false
- [x] formatIsrc("BRABC2312345") → "BR-ABC-23-12345"
- [x] useFonogramasDaObra retorna array direto (sem pagination wrapper)
