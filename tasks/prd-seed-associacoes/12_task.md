---
status: done
parallelizable: false
blocked_by: ["10.0", "11.0"]
---

<task_context>
<domain>frontend/feature</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>http_server</dependencies>
<unblocks>""</unblocks>
</task_context>

# Tarefa 12.0: Feature Associações — API, Hook, Componentes, Página e Router

## Relacionada às User Stories

- [HU-01] Consultar associações (direta — tela de listagem)
- [HU-03] Selecionar associação ao cadastrar titular (suporte — dados expostos via hook)

## Visão Geral

Implementar a feature completa de Associações: tipos TypeScript (derivados do API Contract), chamadas de API, hook com TanStack Query, componente de tabela específica, página, rotas do domínio Cadastro, providers globais (QueryClient + Router) e composição final em App.tsx/main.tsx.

## Requisitos

- Tipo `Associacao` derivado do schema `AssociacaoResponse` do API Contract
- Funções de API: `getAssociacoes()`, `getAssociacaoById()`
- Hook `useAssociacoes()` com TanStack Query (`staleTime: Infinity`)
- `AssociacoesTable` usando o componente `Table` genérico com colunas: Sigla, Nome, CNPJ
- `AssociacoesPage` compondo PageHeader + AssociacoesTable + Loading/ErrorState
- Router com lazy loading: `/cadastro/associacoes`
- Redirect `/` → `/cadastro/associacoes`
- AppProviders: QueryClientProvider + BrowserRouter
- App.tsx e main.tsx finais

## Arquivos Envolvidos

- **Criar:**
  - `frontend/src/features/cadastro/associacoes/types/associacao.ts`
  - `frontend/src/features/cadastro/associacoes/api/associacoesApi.ts`
  - `frontend/src/features/cadastro/associacoes/hooks/useAssociacoes.ts`
  - `frontend/src/features/cadastro/associacoes/components/AssociacoesTable.tsx`
  - `frontend/src/features/cadastro/associacoes/pages/AssociacoesPage.tsx`
  - `frontend/src/features/cadastro/associacoes/index.ts`
  - `frontend/src/features/cadastro/index.ts`
  - `frontend/src/app/providers/AppProviders.tsx`
  - `frontend/src/app/router/routes.tsx`
- **Modificar:**
  - `frontend/src/main.tsx` (montar AppProviders + App)
  - `frontend/src/App.tsx` (montar Router)
- **Referência:**
  - `tasks/prd-seed-associacoes/api-contract.yaml` (schema AssociacaoResponse)
  - `tasks/prd-seed-associacoes/api-contract.md` (exemplos JSON)
  - `frontend/DESIGN.md` — componentes (seção 7: Data Tables, Node Chip para siglas)
  - `frontend/src/shared/components/ui/table/` (componente Table genérico)
  - `frontend/src/shared/components/layout/main-layout/` (MainLayout)
  - `frontend/src/shared/services/apiClient.ts` (API client)
  - Stitch screen `28d9d5dde6be44c0b3b307bb311051c0` — referência visual pixel-perfect
- **Skills para consultar:**
  - `react-architecture` — features, index.ts, lazy loading, convenções
  - `frontend-design` — fidelidade ao design system

## Subtarefas

- [ ] 12.1 Criar tipo `Associacao` em `types/associacao.ts`
- [ ] 12.2 Criar funções de API em `api/associacoesApi.ts`
- [ ] 12.3 Criar hook `useAssociacoes` em `hooks/useAssociacoes.ts` com `staleTime: Infinity`
- [ ] 12.4 Criar `AssociacoesTable` com colunas Sigla, Nome, CNPJ (usando `--font-mono` no CNPJ)
- [ ] 12.5 Criar `AssociacoesPage` compondo PageHeader + table + loading/error states
- [ ] 12.6 Criar `index.ts` da feature e do domínio Cadastro
- [ ] 12.7 Criar `AppProviders.tsx` (QueryClientProvider + BrowserRouter)
- [ ] 12.8 Criar `routes.tsx` com lazy loading de Cadastro e redirect `/` → `/cadastro/associacoes`
- [ ] 12.9 Atualizar `App.tsx` e `main.tsx`
- [ ] 12.10 Testar end-to-end: frontend + backend rodando, tela exibe 7 associações

## Sequenciamento

- Bloqueado por: 10.0, 11.0
- Desbloqueia: Nenhum
- Paralelizável: Não

## Detalhes de Implementação

### Tipo (derivado do API Contract)

```typescript
export interface Associacao {
  id: string;
  sigla: string;
  nome: string;
  cnpj: string;
}
```

### API

```typescript
import { apiGet } from '@shared/services/apiClient';
import type { Associacao } from '../types/associacao';

export function getAssociacoes(): Promise<Associacao[]> {
  return apiGet<Associacao[]>('/associacoes');
}
```

### Hook

```typescript
import { useQuery } from '@tanstack/react-query';
import { getAssociacoes } from '../api/associacoesApi';

export function useAssociacoes() {
  return useQuery({
    queryKey: ['associacoes'],
    queryFn: getAssociacoes,
    staleTime: Infinity,
  });
}
```

### AssociacoesTable

```typescript
import { Table } from '@components/ui/table';
import type { Associacao } from '../types/associacao';

const columns = [
  { key: 'sigla' as const, header: 'Sigla' },
  { key: 'nome' as const, header: 'Nome' },
  { key: 'cnpj' as const, header: 'CNPJ', render: (v: string) => <span className={styles.mono}>{v}</span> },
];

export function AssociacoesTable({ data }: { data: Associacao[] }) {
  return <Table columns={columns} data={data} keyExtractor={(a) => a.id} />;
}
```

### AssociacoesPage

```typescript
export function AssociacoesPage() {
  const { data, isLoading, error, refetch } = useAssociacoes();
  useDocumentTitle('Associações — mini-ECAD');

  if (isLoading) return <Loading />;
  if (error) return <ErrorState message="Erro ao carregar associações" onRetry={refetch} />;

  return (
    <>
      <PageHeader title="Associações" description="Associações de gestão coletiva do ECAD" />
      <AssociacoesTable data={data!} />
    </>
  );
}
```

### Router

```typescript
const CadastroRoutes = lazy(() => import('@features/cadastro'));

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <Navigate to="/cadastro/associacoes" replace /> },
      { path: 'cadastro/*', element: <Suspense fallback={<Loading />}><CadastroRoutes /></Suspense> },
    ],
  },
]);
```

**Convenções da stack:**
- Feature exporta apenas via `index.ts` (HARD RULE CP-06)
- Import: `import { AssociacoesPage } from '@features/cadastro'`
- CNPJ exibido com `--font-mono` (JetBrains Mono)
- Sem botões de criar/editar/excluir na página (RF-07)

## Critérios de Sucesso (Verificáveis)

- [ ] `npm run build` compila sem erros
- [ ] Acessar `localhost:5173` redireciona para `/cadastro/associacoes`
- [ ] Página exibe tabela com 7 associações (sigla, nome, CNPJ)
- [ ] CNPJ exibido em fonte monoespaçada
- [ ] Estado de loading exibido enquanto aguarda API
- [ ] Estado de erro exibido quando backend indisponível
- [ ] Não há botões de criar/editar/excluir na página
- [ ] Sidebar mostra "Cadastro > Associações" como ativo
