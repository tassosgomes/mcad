---
status: completed
parallelizable: true
blocked_by: ["5.0"]
---

<task_context>
<domain>distribuicao/frontend</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>http_server</dependencies>
<unblocks>""</unblocks>
</task_context>

# Tarefa 7.0: Frontend — módulo distribuicao/rubricas

## Relacionada às User Stories

- [HU-02] Consultar rubricas disponíveis (cobertura direta)

## Visão Geral

Criar o módulo frontend para o domínio Distribuição: API client, tipos TypeScript, hook TanStack Query, componente de tabela, página de listagem, roteamento e ativação no sidebar. Segue o padrão exato dos módulos existentes (cadastro/arrecadacao).

## Requisitos

- API client `apiDistribuicaoClient.ts` (porta 5004)
- Tipos TypeScript para `Rubrica`
- Hook `useRubricas` com TanStack Query
- Tabela com colunas: sigla, nome, exige classificação (badge Sim/Não)
- Estado vazio com mensagem quando não há rubricas
- Read-only (sem botões de ação)
- Rota `/distribuicao/rubricas` acessível no sidebar

## Arquivos Envolvidos

- **Criar:**
  - `frontend/src/shared/services/apiDistribuicaoClient.ts`
  - `frontend/src/features/distribuicao/rubricas/types/rubrica.ts`
  - `frontend/src/features/distribuicao/rubricas/api/rubricasApi.ts`
  - `frontend/src/features/distribuicao/rubricas/hooks/useRubricas.ts`
  - `frontend/src/features/distribuicao/rubricas/components/RubricasTable.tsx`
  - `frontend/src/features/distribuicao/rubricas/pages/RubricasPage.tsx`
  - `frontend/src/features/distribuicao/rubricas/index.ts`
  - `frontend/src/features/distribuicao/index.tsx`
- **Modificar:**
  - `frontend/src/shared/auth/AuthProvider.tsx` (adicionar `setDistribuicaoAuthTokenProvider`)
  - `frontend/src/app/router/routes.tsx` (adicionar rota lazy-load `/distribuicao/*`)
  - `frontend/src/shared/components/layout/sidebar/Sidebar.tsx` (remover `disabled: true`, adicionar sub-item "Rubricas")
- **Referência:**
  - `frontend/src/shared/services/apiArrecadacaoClient.ts` (padrão de API client)
  - `frontend/src/features/arrecadacao/licencas/` (padrão de estrutura de feature)
  - `frontend/src/features/cadastro/associacoes/` (padrão de tabela read-only — associações também são read-only)
  - `frontend/src/shared/components/ui/Badge.tsx` (componente Badge para Sim/Não)
  - `frontend/src/shared/components/ui/PageHeader.tsx` (componente PageHeader)
  - `frontend/src/shared/components/ui/Table.tsx` (componente Table)
  - `tasks/distribuicao/prd-sync-rubricas/api-contract.yaml` (contrato de API)
- **Skills para consultar durante implementação:**
  - `react-architecture` — estrutura features/{domain}/{subfeature}/

## Subtarefas

- [ ] 7.1 Criar `apiDistribuicaoClient.ts` seguindo padrão de `apiArrecadacaoClient.ts` (BASE_URL: `VITE_DISTRIBUICAO_API_BASE_URL || 'http://localhost:5004/api/v1'`)
- [ ] 7.2 Criar `rubrica.ts` com interface `Rubrica` (id, sigla, nome, exigeClassificacao)
- [ ] 7.3 Criar `rubricasApi.ts` com função `listarRubricas(): Promise<Rubrica[]>`
- [ ] 7.4 Criar `useRubricas.ts` com TanStack Query hook (`queryKey: ['distribuicao', 'rubricas']`)
- [ ] 7.5 Criar `RubricasTable.tsx` com colunas sigla, nome, badge Sim/Não para exigeClassificacao
- [ ] 7.6 Criar `RubricasPage.tsx` com PageHeader + RubricasTable + estado vazio
- [ ] 7.7 Criar `index.ts` (barrel exports) e `index.tsx` (router com `<Route path="rubricas" element={<RubricasPage />} />`)
- [ ] 7.8 Modificar `AuthProvider.tsx`: importar e chamar `setDistribuicaoAuthTokenProvider(getToken)`
- [ ] 7.9 Modificar `routes.tsx`: adicionar rota lazy-loaded para `/distribuicao/*`
- [ ] 7.10 Modificar `Sidebar.tsx`: remover `disabled: true` do item Distribuição, adicionar sub-item "Rubricas" com path `/distribuicao/rubricas`
- [ ] 7.11 Verificar que `npm run build` passa sem erros

## Sequenciamento

- Bloqueado por: 5.0 (precisa de `VITE_DISTRIBUICAO_API_BASE_URL` no `.env.example` e sidebar config)
- Desbloqueia: nenhum
- Paralelizável: Sim (pode rodar em paralelo com tasks 2.0-4.0 do backend)

## Rastreabilidade

- Esta tarefa cobre: RF-09, RF-10, RF-11
- Evidência esperada: tela exibe tabela de rubricas ou estado vazio

## Detalhes de Implementação

**apiDistribuicaoClient.ts** — mesmo padrão de apiArrecadacaoClient:
```typescript
export const BASE_URL = import.meta.env.VITE_DISTRIBUICAO_API_BASE_URL || 'http://localhost:5004/api/v1';

let getAuthToken: (() => string | null) | null = null;

export function setDistribuicaoAuthTokenProvider(fn: (() => string | null) | null) {
  getAuthToken = fn;
}

export async function apiGet<T>(path: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getAuthToken?.();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
```

**rubrica.ts:**
```typescript
export interface Rubrica {
  id: string;
  sigla: string;
  nome: string;
  exigeClassificacao: boolean;
}
```

**rubricasApi.ts:**
```typescript
import { apiGet } from '@/shared/services/apiDistribuicaoClient';
import type { Rubrica } from '../types/rubrica';

export function listarRubricas(): Promise<Rubrica[]> {
  return apiGet<Rubrica[]>('/rubricas');
}
```

**useRubricas.ts:**
```typescript
import { useQuery } from '@tanstack/react-query';
import { listarRubricas } from '../api/rubricasApi';

export function useRubricas() {
  return useQuery({
    queryKey: ['distribuicao', 'rubricas'],
    queryFn: listarRubricas,
  });
}
```

**RubricasPage.tsx:**
```tsx
export function RubricasPage() {
  const { data: rubricas, isLoading, error } = useRubricas();

  return (
    <>
      <PageHeader
        title="Rubricas"
        description="Rubricas de utilização musical sincronizadas da Arrecadação"
      />
      {isLoading && <Loading />}
      {error && <ErrorState onRetry={() => {}} />}
      {rubricas?.length === 0 && (
        <EmptyState message="Nenhuma rubrica sincronizada. Aguardando eventos da Arrecadação." />
      )}
      {rubricas && rubricas.length > 0 && <RubricasTable rubricas={rubricas} />}
    </>
  );
}
```

**RubricasTable.tsx:**
```tsx
// Tabela simples com 3 colunas: Sigla, Nome, Exige Classificação (Badge)
// Sem paginação, sem filtros, sem ações
// Badge: "Sim" (variant success) ou "Não" (variant muted)
// Seguir padrão de AssociacoesTable (cadastro) que também é read-only
```

**Sidebar.tsx — ativar Distribuição:**
- Remover `disabled: true` do item existente
- Adicionar `requiredRoles: ['analista-distribuicao', 'consultor-distribuicao']`
- Adicionar sub-items: `[{ label: 'Rubricas', path: '/distribuicao/rubricas' }]`

**routes.tsx — lazy load:**
```tsx
const DistribuicaoRoutes = lazy(() => import('@/features/distribuicao'));
// Dentro do ProtectedRoute:
<Route path="distribuicao/*" element={<DistribuicaoRoutes />} />
```

## Critérios de Sucesso (Verificáveis)

- [ ] Build compila: `cd frontend && npm run build`
- [ ] TypeScript sem erros: `cd frontend && npx tsc --noEmit`
- [ ] Rota `/distribuicao/rubricas` renderiza sem erro
- [ ] Tabela exibe rubricas quando API retorna dados
- [ ] Estado vazio exibido quando API retorna `[]`
- [ ] Sidebar mostra item "Distribuição" com sub-item "Rubricas" (não disabled)
- [ ] Badge "Sim"/"Não" na coluna Exige Classificação
