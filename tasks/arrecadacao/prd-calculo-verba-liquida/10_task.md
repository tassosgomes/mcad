---
status: pending
parallelizable: true
blocked_by: ["7.0"]
---

<task_context>
<domain>frontend/arrecadacao</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>http_server</dependencies>
<unblocks>""</unblocks>
</task_context>

# Tarefa 10.0: Frontend — modulo `verbas` (types, api, hooks, components, pages, routing, sidebar)

## Relacionada as User Stories

- [HU-03] Acompanhar verbas por rubrica x periodo — detalhada (direta)
- [HU-04] Acompanhar verbas por rubrica — agregada (direta)
- [HU-05] Visualizar status da verba (direta — badge colorida)

## Visao Geral

Criar o modulo `features/arrecadacao/verbas` no frontend React + Vite + TypeScript seguindo o padrao ja consolidado (`pagamentos`, `licencas`, `usuarios-musica`): types, api client, hooks via TanStack Query, componentes (badge, filtros, tabelas detalhada/agregada), uma pagina com toggle entre as duas visoes, e registro da rota + entrada na sidebar.

## Requisitos

- Estrutura de pastas:
  ```
  src/features/arrecadacao/verbas/
    api/verbasApi.ts
    components/
      StatusBadgeVerba.tsx
      VerbasFilters.tsx
      VerbasTable.tsx            (detalhada — HU-03)
      VerbasAgregadoTable.tsx    (agregada com expansao — HU-04)
    hooks/
      useVerbas.ts
      useVerbasAgregado.ts
      useVerba.ts                (busca por rubrica/periodo — RF-21)
    pages/
      VerbasPage.tsx             (toggle/tabs entre as duas visoes)
    types/verba.ts
  ```
- `types/verba.ts`: `Verba`, `VerbaAgregado`, `StatusVerba`, `VerbasFilter`, `VerbaListResponse`
- `verbasApi.ts`: 3 funcoes usando `apiClient` central (com auth headers ja injetados):
  - `listarVerbas(filtros): Promise<VerbaListResponse>`
  - `listarVerbasAgregadas(filtros): Promise<VerbaAgregado[]>`
  - `buscarVerba(rubricaSigla, periodo): Promise<Verba>`
- Hooks com `useQuery` e `queryKey` incluindo filtros — pattern do `useLicencas`
- `StatusBadgeVerba.tsx` com tres cores: ABERTA (verde), EM_DISTRIBUICAO (amarelo pulsante via CSS), DISTRIBUIDA (azul)
- `VerbasTable.tsx`: colunas conforme RF-17, paginacao, sort default `-periodo`, formatacao R$ com 2 casas
- `VerbasAgregadoTable.tsx`: linha por rubrica com chevron; ao expandir, mostrar lista de periodos da rubrica
- `VerbasFilters.tsx`: dropdown rubrica (carregar via API ja existente em rubricasApi), seletor periodo, dropdown status
- `VerbasPage.tsx`: tabs ou toggle "Detalhada / Agregada por rubrica"
- Rota: registrar em `src/features/arrecadacao/index.tsx`:
  - `<Route path="verbas" element={<VerbasPage />} />`
- Sidebar: adicionar em `Sidebar.tsx` apos "Pagamentos":
  - `{ label: 'Verbas', path: '/arrecadacao/verbas' }`
- Proteger rota com `RequireRole(['analista-arrecadacao', 'consultor-arrecadacao'])` consistente com outras
- Valores monetarios formatados com `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`
- CSS Modules (padrao do projeto); sem libs UI externas

## Subtarefas

- [ ] 10.1 Criar types em `verba.ts`
- [ ] 10.2 Criar `verbasApi.ts` com 3 funcoes
- [ ] 10.3 Criar hooks `useVerbas`, `useVerbasAgregado`, `useVerba`
- [ ] 10.4 Criar `StatusBadgeVerba.tsx` + CSS Module
- [ ] 10.5 Criar `VerbasFilters.tsx` com integracao a rubricas existentes
- [ ] 10.6 Criar `VerbasTable.tsx` (detalhada) com paginacao + sort
- [ ] 10.7 Criar `VerbasAgregadoTable.tsx` (agregada com expansao por rubrica)
- [ ] 10.8 Criar `VerbasPage.tsx` com toggle/tabs
- [ ] 10.9 Registrar rota em `features/arrecadacao/index.tsx`
- [ ] 10.10 Adicionar entrada na `Sidebar.tsx`
- [ ] 10.11 Smoke test manual: `npm run dev`, navegar para `/arrecadacao/verbas`, alternar visoes, aplicar filtros, expandir agregado

## Sequenciamento

- Bloqueado por: 7.0 (precisa do contrato real; pode comecar antes usando mock se urgente)
- Desbloqueia: nada
- Paralelizavel: Sim (independente de 9.0)

## Rastreabilidade

- Esta tarefa cobre: HU-03 (direta), HU-04 (direta), HU-05 (direta)
- Evidencia esperada: `npm run build` verde; smoke test manual com screenshots; tela `/arrecadacao/verbas` funcional em dev

## Detalhes de Implementacao

Pattern do hook (consistente com `useLicencas`):

```ts
export function useVerbas(filtros: VerbasFilter) {
  return useQuery({
    queryKey: ['verbas', filtros],
    queryFn: () => listarVerbas(filtros),
    placeholderData: keepPreviousData,
  });
}
```

Toggle na page:

```tsx
const [view, setView] = useState<'detalhada' | 'agregada'>('detalhada');
// ...
{view === 'detalhada'
  ? <VerbasTable filtros={filtros} />
  : <VerbasAgregadoTable filtros={filtros} />}
```

Formatador monetario centralizado:

```ts
const fmtBRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});
export const formatBRL = (v: string | number) => fmtBRL.format(Number(v));
```

## Criterios de Sucesso

- `npm run build` ok
- Rota `/arrecadacao/verbas` carrega sem erro com role correta
- Toggle alterna entre visoes sem reload
- Filtros disparam refetch com `queryKey` correto
- Badge muda cor por status; valor formatado em R$ X.XXX,XX
- Expansao da agregada mostra periodos da rubrica
- 401 redireciona para login (auth ja generico)
- 403 mostra tela de "sem permissao" (padrao do projeto)
