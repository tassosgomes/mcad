# Especificação Técnica Frontend — F04: Identificação de Execuções

> **PRD:** `tasks/prd-identificacao-execucoes/prd.md`
> **API Contract:** `tasks/prd-identificacao-execucoes/api-contract.yaml`
> **TechSpec Backend:** `tasks/prd-identificacao-execucoes/techspec.md`
> **Domínio:** Identificação (D02)
> **Última revisão:** 2026-04-04

---

## Resumo Executivo

Esta feature cria uma **nova página** `/identificacao/pendentes` (primeira tela fora da CaptacaoDetailPage) com duas visões: lista de execuções pendentes e visão de impacto agrupada por ISRC/ISWC. Inclui resolução manual individual (reutilizando BuscaCadastroAutocomplete da F02), resolução em lote com checkboxes de confirmação, e navegação para a captação de origem.

---

## Stitch — Mockup Obrigatório

| Campo | Valor |
|-------|-------|
| **Projeto** | mcad |
| **ID** | `533156784329699726` |

**Telas a desenhar:**

| # | Tela | Descrição |
|---|------|-----------|
| 1 | Lista de pendentes | Tabela com filtros (captação, rubrica, período, ISRC), badge de impacto (N captações), botão "Resolver" por linha |
| 2 | Visão de impacto | Agrupado por ISRC/ISWC: total execuções, total captações, drill-down expandível. Botão "Resolver todas" |
| 3 | Modal de resolução individual | BuscaCadastroAutocomplete (F02), preview da execução, botão confirmar |
| 4 | Fluxo de resolução em lote | Selecionar obra → lista de execuções afetadas com checkboxes → confirmar. Resultado: N resolvidas, M rejeitadas |

---

## Arquitetura do Módulo

### Estrutura de Pastas (incremental)

```
frontend/src/features/identificacao/
├── index.tsx                                          # MODIFICAR — adicionar rota /pendentes
└── pendentes/                                         # NOVO módulo
    ├── index.ts                                       # Barrel export
    ├── types/
    │   └── pendente.ts                                # Tipos
    ├── api/
    │   └── pendentesApi.ts                            # API client
    ├── hooks/
    │   ├── usePendentes.ts                            # Lista com filtros
    │   ├── useImpactoPendentes.ts                     # Visão agrupada
    │   ├── useResolverPendente.ts                     # Mutation individual
    │   └── useResolverPendentesEmLote.ts              # Mutation lote
    ├── pages/
    │   └── PendentesPage.tsx                          # Tela com tabs (lista / impacto)
    └── components/
        ├── PendentesTable.tsx                         # Tabela de execuções pendentes
        ├── PendentesTable.module.css
        ├── PendentesFilters.tsx                       # Filtros
        ├── PendentesFilters.module.css
        ├── ImpactoView.tsx                            # Visão agrupada com drill-down
        ├── ImpactoView.module.css
        ├── ResolverPendenteModal.tsx                  # Modal resolução individual
        ├── ResolverPendenteModal.module.css
        ├── ResolverLoteModal.tsx                      # Modal resolução em lote
        └── ResolverLoteModal.module.css
```

---

## Tipos TypeScript

```typescript
// types/pendente.ts

export interface ExecucaoPendente {
  id: string;
  captacaoId: string;
  captacaoRubrica: string;
  captacaoPeriodo: string;
  captacaoStatus: string;
  captacaoAnalistaResponsavel: string;
  obraId: string | null;
  fonogramaId: string | null;
  obraTitulo: string;
  fonogramaIsrc: string | null;
  obraIswc: string | null;
  interpretes: string;
  inicio: string;
  fim: string;
  quantidade: number;
  status: 'PENDENTE';
  criadoEm: string;
}

export interface CaptacaoImpacto {
  captacaoId: string;
  rubrica: string;
  periodo: string;
  execucoesPendentes: number;
}

export interface ImpactoPendente {
  identificador: string;
  tipoIdentificador: 'isrc' | 'iswc' | 'desconhecido';
  obraTitulo: string | null;
  totalExecucoes: number;
  totalCaptacoes: number;
  captacoes: CaptacaoImpacto[];
}

export interface ResolverPendenteRequest {
  obraId: string;
  fonogramaId?: string | null;
}

export interface ResolverLoteRequest {
  execucaoIds: string[];
  obraId: string;
  fonogramaId?: string | null;
}

export interface ResolverLoteResponse {
  resolvidas: number;
  rejeitadas: number;
  detalhesRejeitadas: Array<{ execucaoId: string; motivo: string }>;
}

export interface PendenteListResponse {
  data: ExecucaoPendente[];
  pagination: { page: number; size: number; total: number; totalPages: number };
}

export interface ImpactoPendenteListResponse {
  data: ImpactoPendente[];
  pagination: { page: number; size: number; total: number; totalPages: number };
}

export interface PendenteFiltros {
  page: number;
  size: number;
  sort?: string;
  captacaoId?: string;
  rubricaId?: string;
  periodoInicio?: string;
  periodoFim?: string;
  q?: string;
}
```

---

## Camada de API

```typescript
// api/pendentesApi.ts
import { apiGet, apiPost } from '@shared/services/apiIdentificacaoClient';

export function getPendentes(filtros: PendenteFiltros) {
  const params = new URLSearchParams();
  params.set('page', String(filtros.page));
  params.set('size', String(filtros.size));
  if (filtros.sort) params.set('sort', filtros.sort);
  if (filtros.captacaoId) params.set('captacaoId', filtros.captacaoId);
  if (filtros.rubricaId) params.set('rubricaId', filtros.rubricaId);
  if (filtros.periodoInicio) params.set('periodoInicio', filtros.periodoInicio);
  if (filtros.periodoFim) params.set('periodoFim', filtros.periodoFim);
  if (filtros.q) params.set('q', filtros.q);
  return apiGet<PendenteListResponse>(`/pendentes?${params}`);
}

export function getImpactoPendentes(sort = '-totalCaptacoes', page = 1, size = 20) {
  return apiGet<ImpactoPendenteListResponse>(
    `/pendentes/impacto?sort=${sort}&page=${page}&size=${size}`);
}

export function resolverPendente(id: string, data: ResolverPendenteRequest) {
  return apiPost<ExecucaoPendente>(`/pendentes/${id}/resolver`, data);
}

export function resolverPendentesEmLote(data: ResolverLoteRequest) {
  return apiPost<ResolverLoteResponse>('/pendentes/resolver-lote', data);
}
```

---

## Hooks React Query

```typescript
// usePendentes.ts
export function usePendentes(filtros: PendenteFiltros) {
  return useQuery({
    queryKey: ['pendentes', filtros],
    queryFn: () => getPendentes(filtros),
    placeholderData: keepPreviousData,
  });
}

// useImpactoPendentes.ts
export function useImpactoPendentes(sort: string, page: number) {
  return useQuery({
    queryKey: ['pendentes', 'impacto', sort, page],
    queryFn: () => getImpactoPendentes(sort, page),
    placeholderData: keepPreviousData,
  });
}

// useResolverPendente.ts
export function useResolverPendente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ResolverPendenteRequest }) =>
      resolverPendente(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendentes'] });
      queryClient.invalidateQueries({ queryKey: ['execucoes'] }); // tabela de execuções da captação
      queryClient.invalidateQueries({ queryKey: ['captacoes'] }); // contadores de resumo
    },
  });
}

// useResolverPendentesEmLote.ts
export function useResolverPendentesEmLote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resolverPendentesEmLote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendentes'] });
      queryClient.invalidateQueries({ queryKey: ['execucoes'] });
      queryClient.invalidateQueries({ queryKey: ['captacoes'] });
    },
  });
}
```

---

## Design de Componentes

### PendentesPage.tsx — Página com tabs

**Layout:**
```
┌─────────────────────────────────────────────┐
│ Execuções Pendentes                          │
│ [Lista] [Impacto]                    ← tabs  │
├─────────────────────────────────────────────┤
│ (Tab Lista ativa)                            │
│ [PendentesFilters]                           │
│ [PendentesTable]                             │
│ [Pagination]                                 │
├─────────────────────────────────────────────┤
│ (Tab Impacto ativa)                          │
│ [ImpactoView]                                │
│ [Pagination]                                 │
└─────────────────────────────────────────────┘
```

Duas abas (tabs): "Lista" (execuções individuais) e "Impacto" (agrupado por ISRC/ISWC).

### PendentesTable.tsx

**Colunas:**

| Coluna | Campo | Descrição |
|--------|-------|-----------|
| Título/ISRC | `obraTitulo` + `fonogramaIsrc` | Título em bold, ISRC mono abaixo |
| Captação | `captacaoRubrica` + `captacaoPeriodo` | "TV Aberta — 15/01/2026" como link para detalhe |
| Responsável | `captacaoAnalistaResponsavel` | Nome do analista |
| Horário | `inicio` — `fim` | HH:mm:ss |
| Qtd | `quantidade` | Número |
| Ações | — | Botão "Resolver" (se captação ABERTA) |

Link na coluna "Captação" → navega para `/identificacao/captacoes/{captacaoId}`.

### ImpactoView.tsx — Visão agrupada

**Layout por item:**
```
┌──────────────────────────────────────────────┐
│ 🎵 BRUM99999999          15 exec · 3 captações │
│    (título desconhecido)        [Resolver todas]│
│  ▼ Captações afetadas:                         │
│    TV Aberta — 15/01/2026 — 8 pendentes        │
│    Rádio AM/FM — 15/01/2026 — 5 pendentes      │
│    TV Fechada — 16/01/2026 — 2 pendentes        │
└──────────────────────────────────────────────┘
```

Drill-down expandível (accordion). Botão "Resolver todas" abre `ResolverLoteModal`.

### ResolverPendenteModal.tsx

**Props:**
```typescript
interface ResolverPendenteModalProps {
  pendente: ExecucaoPendente | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}
```

**Conteúdo:**
- Preview da execução (título, ISRC, captação, horário)
- `BuscaCadastroAutocomplete` (reutilizado da F02) para selecionar obra/fonograma LIBERADA
- Botão "Confirmar Resolução"
- Tratamento de erro `OBRA_NAO_LIBERADA` → toast

### ResolverLoteModal.tsx

**Props:**
```typescript
interface ResolverLoteModalProps {
  identificador: string;     // ISRC/ISWC
  execucoes: ExecucaoPendente[];  // Pré-carregadas
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}
```

**Fluxo:**
1. Exibe `BuscaCadastroAutocomplete` para selecionar obra/fonograma
2. Após selecionar → exibe lista de execuções com checkboxes (todas marcadas por default)
3. Execuções de captações FECHADAS aparecem desabilitadas com tooltip
4. Analista desmarca as que não quer resolver
5. Confirma → POST `/resolver-lote` com IDs selecionados
6. Resultado: toast "12 resolvidas, 3 rejeitadas" + detalhes das rejeitadas

---

## Roteamento

### Nova rota

```typescript
// features/identificacao/index.tsx — adicionar:
import { PendentesPage } from './pendentes';

<Route path="pendentes" element={<PendentesPage />} />
```

### Sidebar — novo item

```typescript
// Sidebar.tsx — dentro de children de Identificação:
{ label: 'Pendentes', path: '/identificacao/pendentes' },
```

---

## Inventário de Artefatos

### Arquivos a Criar

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| `frontend/src/features/identificacao/pendentes/index.ts` | Barrel | Export da PendentesPage |
| `frontend/src/features/identificacao/pendentes/types/pendente.ts` | Types | Interfaces |
| `frontend/src/features/identificacao/pendentes/api/pendentesApi.ts` | API | 4 funções |
| `frontend/src/features/identificacao/pendentes/hooks/usePendentes.ts` | Hook | Lista com filtros |
| `frontend/src/features/identificacao/pendentes/hooks/useImpactoPendentes.ts` | Hook | Visão agrupada |
| `frontend/src/features/identificacao/pendentes/hooks/useResolverPendente.ts` | Hook | Mutation individual |
| `frontend/src/features/identificacao/pendentes/hooks/useResolverPendentesEmLote.ts` | Hook | Mutation lote |
| `frontend/src/features/identificacao/pendentes/pages/PendentesPage.tsx` | Page | Tabs lista/impacto |
| `frontend/src/features/identificacao/pendentes/components/PendentesTable.tsx` + `.module.css` | Component | Tabela com link para captação |
| `frontend/src/features/identificacao/pendentes/components/PendentesFilters.tsx` + `.module.css` | Component | Filtros |
| `frontend/src/features/identificacao/pendentes/components/ImpactoView.tsx` + `.module.css` | Component | Accordion agrupado |
| `frontend/src/features/identificacao/pendentes/components/ResolverPendenteModal.tsx` + `.module.css` | Component | Modal individual |
| `frontend/src/features/identificacao/pendentes/components/ResolverLoteModal.tsx` + `.module.css` | Component | Modal lote com checkboxes |

### Arquivos a Modificar

| Caminho | Alteração |
|---------|-----------|
| `frontend/src/features/identificacao/index.tsx` | Adicionar rota `/pendentes` |
| `frontend/src/shared/components/layout/sidebar/Sidebar.tsx` | Adicionar "Pendentes" nos children de Identificação |

### Arquivos de Referência

| Caminho | Motivo |
|---------|--------|
| `frontend/src/features/identificacao/captacoes/components/BuscaCadastroAutocomplete.tsx` | Reutilizar no ResolverPendenteModal |
| `frontend/src/features/identificacao/captacoes/components/ExecucoesTable.tsx` | Padrão de tabela |
| `frontend/src/features/identificacao/captacoes/pages/CaptacoesPage.tsx` | Padrão de page com filtros |
| `frontend/src/shared/components/ui/badge/Badge.tsx` | Badges |
| `frontend/src/shared/components/ui/pagination/Pagination.tsx` | Paginação |

---

## Sequenciamento

| # | Etapa | Dependência |
|---|-------|-------------|
| 1 | Stitch mockups (4 telas) | Nenhuma |
| 2 | types/pendente.ts | api-contract |
| 3 | api/pendentesApi.ts | Etapa 2 |
| 4 | hooks (4 hooks) | Etapa 3 |
| 5 | PendentesTable + PendentesFilters | Etapa 4 + mockups |
| 6 | ImpactoView | Etapa 4 + mockups |
| 7 | ResolverPendenteModal + ResolverLoteModal | Etapa 4 + BuscaCadastroAutocomplete (F02) |
| 8 | PendentesPage (tabs + orquestração) | Etapa 5 + 6 + 7 |
| 9 | Routing + Sidebar | Etapa 8 |

---

*TechSpec Frontend gerada com a skill `flow-techspec-creator`.*
