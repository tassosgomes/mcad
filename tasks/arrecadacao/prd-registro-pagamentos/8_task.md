---
status: done
parallelizable: false
blocked_by: ["6.0"]
---

<task_context>
<domain>arrecadacao/frontend</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>http_server</dependencies>
<unblocks>"9.0"</unblocks>
</task_context>

# Tarefa 8.0: Frontend — formatCurrency + types + API functions + hooks (UDA + Pagamentos)

## Relacionada as User Stories

- [HU-01] Ajustar valor UDA (cobertura direta — data layer)
- [HU-02] Consultar historico UDA (cobertura direta — data layer)
- [HU-03] Registrar pagamento (cobertura direta — data layer)
- [HU-04] Consultar pagamentos (cobertura direta — data layer)
- [HU-05] Visualizar detalhes pagamento (cobertura direta — data layer)
- [HU-06] Consultar UDA vigente (cobertura direta — data layer)

## Visao Geral

Estabelece a camada de dados frontend para os dois modulos (uda/ e pagamentos/): utilitario `formatCurrency` compartilhado, tipos TypeScript derivados do api-contract, 6 funcoes de chamada HTTP e 6 hooks TanStack Query (queries + mutations). Reutiliza `apiArrecadacaoClient` criado no F03.

## Requisitos

- Criar `formatCurrency.ts` com `formatBRL()` e `formatUdas()` em `arrecadacao/shared/utils/`
- Criar tipos UDA: `UdaValor`, `AjustarUdaRequest`
- Criar tipos Pagamentos: `StatusPagamento`, `LicencaResumo`, `Pagamento`, `PagamentoListResponse`, `RegistrarPagamentoRequest`, `PagamentoFiltros`
- Criar 3 funcoes API UDA: `getUdaVigente`, `ajustarUda`, `getHistoricoUda`
- Criar 3 funcoes API Pagamentos: `getPagamentos`, `registrarPagamento`, `getPagamentoById`
- Criar 3 hooks UDA: `useUdaVigente`, `useHistoricoUda`, `useAjustarUda`
- Criar 3 hooks Pagamentos: `usePagamentos`, `usePagamento`, `useRegistrarPagamento`
- Mutations invalidam queries relevantes no `onSuccess`

## Arquivos Envolvidos

- **Criar:**
  - `frontend/src/features/arrecadacao/shared/utils/formatCurrency.ts`
  - `frontend/src/features/arrecadacao/uda/types/uda.ts`
  - `frontend/src/features/arrecadacao/uda/api/udaApi.ts`
  - `frontend/src/features/arrecadacao/uda/hooks/useUdaVigente.ts`
  - `frontend/src/features/arrecadacao/uda/hooks/useHistoricoUda.ts`
  - `frontend/src/features/arrecadacao/uda/hooks/useAjustarUda.ts`
  - `frontend/src/features/arrecadacao/pagamentos/types/pagamento.ts`
  - `frontend/src/features/arrecadacao/pagamentos/api/pagamentosApi.ts`
  - `frontend/src/features/arrecadacao/pagamentos/hooks/usePagamentos.ts`
  - `frontend/src/features/arrecadacao/pagamentos/hooks/usePagamento.ts`
  - `frontend/src/features/arrecadacao/pagamentos/hooks/useRegistrarPagamento.ts`
- **Referencia:**
  - `frontend/src/shared/services/apiArrecadacaoClient.ts` (apiGetArr, apiPostArr — criado no F03)
  - `frontend/src/features/arrecadacao/licencas/types/licenca.ts` (padrao de tipos)
  - `frontend/src/features/arrecadacao/licencas/hooks/useLicencas.ts` (padrao de hooks)
  - `tasks/arrecadacao/prd-registro-pagamentos/api-contract.yaml`
- **Skills para consultar durante implementacao:**
  - `react-architecture` — feature modules, hooks pattern
  - `react-code-quality` — TypeScript strict, interface naming

## Subtarefas

- [x] 8.1 Criar `formatCurrency.ts` com `formatBRL()` e `formatUdas()`
- [x] 8.2 Criar `uda/types/uda.ts` com `UdaValor` e `AjustarUdaRequest`
- [x] 8.3 Criar `uda/api/udaApi.ts` com 3 funcoes HTTP
- [x] 8.4 Criar 3 hooks UDA: `useUdaVigente` (retry: false para 404), `useHistoricoUda`, `useAjustarUda`
- [x] 8.5 Criar `pagamentos/types/pagamento.ts` com todos os tipos
- [x] 8.6 Criar `pagamentos/api/pagamentosApi.ts` com 3 funcoes HTTP
- [x] 8.7 Criar 3 hooks Pagamentos: `usePagamentos`, `usePagamento`, `useRegistrarPagamento`

## Sequenciamento

- Bloqueado por: 6.0 (backend API layer disponivel)
- Desbloqueia: 9.0
- Paralelizavel: Nao

## Rastreabilidade

- Esta tarefa cobre: RF-01 a RF-17 (camada de dados frontend)
- Evidencia esperada: TypeScript compila sem erros; hooks exportados e consumiveis pelas paginas

## Detalhes de Implementacao

**formatCurrency.ts:**

```typescript
// src/features/arrecadacao/shared/utils/formatCurrency.ts
export function formatBRL(value: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return 'R$ 0,00';
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatUdas(value: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return '0';
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 6 });
}
```

**uda/types/uda.ts:**

```typescript
export interface UdaValor {
  id: string;
  valor: string;           // string decimal "107.310000"
  dataVigencia: string;    // ISO date "2026-01-01"
  criadoEm: string;
  criadoPor: string | null; // null for seed
}

export interface AjustarUdaRequest {
  valor: string;           // string decimal
  dataVigencia: string;    // ISO date
}
```

**pagamentos/types/pagamento.ts:**

```typescript
export type StatusPagamento = 'CONFIRMADO' | 'ESTORNADO';

export interface LicencaResumo {
  id: string;
  status: string;
  usuarioMusica: { id: string; razaoSocial: string; cnpj: string; };
  rubrica: { id: string; sigla: string; nome: string; };
}

export interface Pagamento {
  id: string;
  licenca: LicencaResumo;
  quantidadeUdas: string;
  valorUdaNoMomento: string;
  valorBruto: string;
  periodo: string;
  status: StatusPagamento;
  dataRegistro: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface PagamentoListResponse {
  data: Pagamento[];
  pagination: { page: number; size: number; total: number; totalPages: number; };
}

export interface RegistrarPagamentoRequest {
  licencaId: string;
  quantidadeUdas: string;
}

export interface PagamentoFiltros {
  page: number;
  size: number;
  sort: string;
  usuarioMusicaId?: string;
  razaoSocial?: string;
  rubricaSigla?: string;
  periodo?: string;
  status?: StatusPagamento | '';
}
```

**Hooks UDA (padrao):**

```typescript
export function useUdaVigente() {
  return useQuery({ queryKey: ['uda', 'vigente'], queryFn: getUdaVigente, retry: false });
}

export function useAjustarUda() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ajustarUda,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['uda'] }); },
  });
}
```

**Hooks Pagamentos (padrao):**

```typescript
export function usePagamentos(filtros: PagamentoFiltros) {
  return useQuery({ queryKey: ['pagamentos', filtros], queryFn: () => getPagamentos(filtros) });
}

export function useRegistrarPagamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: registrarPagamento,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pagamentos'] }); },
  });
}
```

**Convencoes da stack:**
- TypeScript strict, sem `any`
- Interfaces para props e types
- Hooks com prefix `use`
- Funcoes API em modulos separados (`api/`)
- String decimal para valores monetarios (nunca number)
- Query keys hierarquicas: ['uda', 'vigente'], ['pagamentos', filtros]

## Criterios de Sucesso (Verificaveis)

- [x] Build compila: `cd frontend && npm run build`
- [x] TypeScript sem erros: `cd frontend && npx tsc --noEmit`
- [x] Hooks exportados e importaveis pelos componentes
- [x] `formatBRL("107.310000")` retorna "R$ 107,31"
- [x] `formatUdas("2.500000")` retorna "2,5"
