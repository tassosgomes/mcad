# Tech Spec Frontend — F02: Gestão de Processos de Distribuição

> **PRD:** `tasks/distribuicao/prd-gestao-processos/prd.md`
> **API Contract:** `tasks/distribuicao/prd-gestao-processos/api-contract.yaml`
> **TechSpec Backend:** `tasks/distribuicao/prd-gestao-processos/techspec.md`
> **Domínio:** Distribuição (D04)
> **Data:** 2026-04-10

---

## Resumo Executivo

Implementação do módulo frontend `features/distribuicao/processos/` para gestão do ciclo de vida dos processos de distribuição. Inclui 3 páginas (listagem com filtros/paginação, detalhes com ações por estado, criação com seleção de disponíveis), 6 componentes, 4 hooks TanStack Query e extensão do API client existente. Segue os padrões estabelecidos por `arrecadacao/pagamentos` (listagem paginada com filtros) e `arrecadacao/licencas` (badges de status e modais de ação).

## Skills de Referência

| Skill | Decisões Influenciadas |
|-------|------------------------|
| `react-architecture` | Estrutura features/{domain}/{subfeature}/, barrel exports |
| `react-code-quality` | TypeScript strict, naming, componentes puros |

---

## Arquitetura do Módulo

### Estrutura de Arquivos

```
features/distribuicao/
├── index.tsx                              (MODIFICAR: adicionar rotas processos)
├── rubricas/                              (existente — F01)
└── processos/                             (NOVO — F02)
    ├── types/
    │   └── processo.ts
    ├── api/
    │   └── processosApi.ts
    ├── hooks/
    │   ├── useProcessos.ts
    │   ├── useProcesso.ts
    │   ├── useDisponiveis.ts
    │   └── useProcessoMutations.ts
    ├── components/
    │   ├── ProcessosFilters.tsx
    │   ├── ProcessosTable.tsx
    │   ├── ProcessoStatusBadge.tsx
    │   ├── ProcessoActions.tsx
    │   ├── DisponibilidadeList.tsx
    │   ├── CancelarModal.tsx
    │   └── FinalizarModal.tsx
    ├── pages/
    │   ├── ProcessosPage.tsx
    │   ├── ProcessoDetailPage.tsx
    │   └── CriarProcessoPage.tsx
    └── index.ts
```

### Fluxo de Dados

```
API (porta 5004)
    │
    ▼
processosApi.ts  ──────────────────────────────────────
    │                                                  │
    ▼                                                  ▼
useProcessos.ts (list)     useProcesso.ts (detail)    useDisponiveis.ts
useProcessoMutations.ts    useProcessoMutations.ts
    │                          │                       │
    ▼                          ▼                       ▼
ProcessosPage.tsx          ProcessoDetailPage.tsx     CriarProcessoPage.tsx
├── ProcessosFilters       ├── ProcessoStatusBadge    ├── DisponibilidadeList
├── ProcessosTable         ├── ProcessoActions
├── Pagination             ├── CancelarModal
└── ProcessoStatusBadge    └── FinalizarModal
```

---

## Design de Implementação

### Tipos TypeScript

```typescript
// processo.ts

export type StatusProcesso = 'CRIADO' | 'CALCULADO' | 'APROVADO' | 'FINALIZADO' | 'CANCELADO';

export interface RubricaResumo {
  sigla: string;
  nome: string;
}

export interface Processo {
  id: string;
  rubrica: RubricaResumo;
  periodo: string;          // YYYY-MM
  status: StatusProcesso;
  verbaLiquida: number;
  totalExecucoes: number | null;
  analistaResponsavel: string;
  criadoEm: string;        // ISO 8601
  calculadoEm: string | null;
  aprovadoEm: string | null;
  finalizadoEm: string | null;
  canceladoEm: string | null;
  justificativaCancelamento: string | null;
}

export interface ProcessoListResponse {
  items: Processo[];
  metadata: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export interface CriarProcessoRequest {
  rubricaSigla: string;
  periodo: string;
}

export interface CancelarProcessoRequest {
  justificativa: string;
}

export interface Disponibilidade {
  rubrica: RubricaResumo;
  periodo: string;
  verbaLiquida: number;
  totalExecucoes: number;
}

export interface ProcessoFiltros {
  page: number;
  size: number;
  rubrica?: string;
  periodo?: string;
  status?: string;    // "CRIADO,CALCULADO" (multi-value CSV)
  sort: string;
}
```

### API Client

```typescript
// processosApi.ts
import { apiGetDist, apiPostDist } from '@/shared/services/apiDistribuicaoClient';
import type {
  Processo, ProcessoListResponse, CriarProcessoRequest,
  CancelarProcessoRequest, Disponibilidade, ProcessoFiltros
} from '../types/processo';

export function listarProcessos(filtros: ProcessoFiltros): Promise<ProcessoListResponse> {
  const params = new URLSearchParams();
  params.set('page', String(filtros.page));
  params.set('size', String(filtros.size));
  params.set('sort', filtros.sort);
  if (filtros.rubrica) params.set('rubrica', filtros.rubrica);
  if (filtros.periodo) params.set('periodo', filtros.periodo);
  if (filtros.status) params.set('status', filtros.status);
  return apiGetDist<ProcessoListResponse>(`/processos?${params}`);
}

export function buscarProcesso(id: string): Promise<Processo> {
  return apiGetDist<Processo>(`/processos/${id}`);
}

export function listarDisponiveis(): Promise<Disponibilidade[]> {
  return apiGetDist<Disponibilidade[]>('/processos/disponiveis');
}

export function criarProcesso(data: CriarProcessoRequest): Promise<Processo> {
  return apiPostDist<Processo>('/processos', data);
}

export function calcularProcesso(id: string): Promise<Processo> {
  return apiPostDist<Processo>(`/processos/${id}/calcular`, {});
}

export function aprovarProcesso(id: string): Promise<Processo> {
  return apiPostDist<Processo>(`/processos/${id}/aprovar`, {});
}

export function finalizarProcesso(id: string): Promise<Processo> {
  return apiPostDist<Processo>(`/processos/${id}/finalizar`, {});
}

export function cancelarProcesso(id: string, data: CancelarProcessoRequest): Promise<Processo> {
  return apiPostDist<Processo>(`/processos/${id}/cancelar`, data);
}
```

**Nota:** `apiPostDist` precisa ser adicionado ao `apiDistribuicaoClient.ts` (atualmente só tem GET).

### Hooks TanStack Query

```typescript
// useProcessos.ts — listagem paginada com filtros
export function useProcessos(filtros: ProcessoFiltros) {
  return useQuery({
    queryKey: ['distribuicao', 'processos', filtros],
    queryFn: () => listarProcessos(filtros),
    keepPreviousData: true,  // evita flash ao trocar página
  });
}

// useProcesso.ts — detalhe por ID
export function useProcesso(id: string) {
  return useQuery({
    queryKey: ['distribuicao', 'processos', id],
    queryFn: () => buscarProcesso(id),
    enabled: !!id,
  });
}

// useDisponiveis.ts — combinações disponíveis para criação
export function useDisponiveis() {
  return useQuery({
    queryKey: ['distribuicao', 'processos', 'disponiveis'],
    queryFn: listarDisponiveis,
  });
}

// useProcessoMutations.ts — todas as mutations
export function useCriarProcesso() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: criarProcesso,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distribuicao', 'processos'] });
    },
  });
}

export function useCalcularProcesso() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: calcularProcesso,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['distribuicao', 'processos'] });
      queryClient.invalidateQueries({ queryKey: ['distribuicao', 'processos', id] });
    },
  });
}

export function useAprovarProcesso() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: aprovarProcesso,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['distribuicao', 'processos'] });
      queryClient.invalidateQueries({ queryKey: ['distribuicao', 'processos', id] });
    },
  });
}

export function useFinalizarProcesso() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: finalizarProcesso,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['distribuicao', 'processos'] });
      queryClient.invalidateQueries({ queryKey: ['distribuicao', 'processos', id] });
    },
  });
}

export function useCancelarProcesso() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CancelarProcessoRequest }) =>
      cancelarProcesso(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['distribuicao', 'processos'] });
      queryClient.invalidateQueries({ queryKey: ['distribuicao', 'processos', id] });
    },
  });
}
```

### Componentes

#### ProcessoStatusBadge

```typescript
// Mapeamento status → variant do Badge (mesmo padrão de licencas/StatusBadgeLicenca)
const STATUS_VARIANT: Record<StatusProcesso, BadgeVariant> = {
  CRIADO: 'accent',       // azul
  CALCULADO: 'warning',   // amarelo
  APROVADO: 'success',    // verde
  FINALIZADO: 'secondary', // verde escuro
  CANCELADO: 'error',     // vermelho
};

const STATUS_LABEL: Record<StatusProcesso, string> = {
  CRIADO: 'Criado',
  CALCULADO: 'Calculado',
  APROVADO: 'Aprovado',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
};
```

#### ProcessoActions — Botões por estado

```typescript
// Renderiza botões condicionais baseados no status
// CRIADO:     [Calcular (primary)] [Cancelar (danger)]
// CALCULADO:  [Aprovar (primary)]  [Cancelar (danger)]
// APROVADO:   [Finalizar (primary)] [Cancelar (danger)]
// FINALIZADO: (nenhum)
// CANCELADO:  (nenhum)

interface ProcessoActionsProps {
  processo: Processo;
  onCalcular: () => void;
  onAprovar: () => void;
  onFinalizar: () => void;    // abre FinalizarModal
  onCancelar: () => void;     // abre CancelarModal
  isLoading: boolean;
}
```

#### ProcessosFilters — Filtros da listagem

```typescript
// Seguir padrão de PagamentosFilters.tsx:
// - Select para rubrica (carregado de useRubricas)
// - Input YYYY-MM para período
// - Multi-select para status (checkboxes ou Select com multiple)
// - Botão "Limpar filtros"
// - Resetar page para 1 ao alterar qualquer filtro

interface ProcessosFiltersProps {
  filtros: ProcessoFiltros;
  onChange: (filtros: Partial<ProcessoFiltros>) => void;
  onClear: () => void;
}
```

#### CancelarModal

```typescript
// Padrão de AlterarStatusModal/EstornarPagamentoModal:
// - Textarea para justificativa
// - Validação min 10 chars
// - Contador de caracteres
// - Botão "Confirmar Cancelamento" (variant danger, disabled durante mutation)
// - Botão "Voltar"

interface CancelarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (justificativa: string) => Promise<void>;
  isLoading: boolean;
}
```

#### FinalizarModal

```typescript
// Modal de confirmação simples (sem formulário):
// - Texto: "Esta ação é irreversível. Os créditos se tornarão definitivos
//           e o Rol será bloqueado para cancelamento. Deseja continuar?"
// - Botão "Cancelar" (secondary)
// - Botão "Confirmar Finalização" (danger)

interface FinalizarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLoading: boolean;
}
```

#### DisponibilidadeList — Tela de criação

```typescript
// Cards/lista mostrando combinações disponíveis para criar processo
// Cada item mostra: rubrica (sigla + nome), período, verba líquida, total execuções
// Click no item → cria processo
// Se lista vazia → estado vazio "Nenhuma combinação disponível para distribuição"

interface DisponibilidadeListProps {
  items: Disponibilidade[];
  onSelect: (item: Disponibilidade) => void;
  isCreating: boolean;
}
```

### Páginas

#### ProcessosPage — Listagem

```typescript
// Estrutura:
// 1. PageHeader (title="Processos de Distribuição", action="Novo Processo" → /processos/novo)
// 2. ProcessosFilters (filtros state gerenciado localmente)
// 3. ProcessosTable (linhas clicáveis → navigate /processos/:id)
// 4. Pagination (onPageChange atualiza filtros.page)
// 5. Estados: Loading, Error (com retry), Empty

// State:
const [filtros, setFiltros] = useState<ProcessoFiltros>({
  page: 1, size: 20, sort: 'criadoEm:desc'
});

// Padrão de PagamentosPage: resetar page ao alterar filtro
const handleFilterChange = (partial: Partial<ProcessoFiltros>) => {
  setFiltros(prev => ({ ...prev, ...partial, page: 1 }));
};
```

#### ProcessoDetailPage — Detalhes + Ações

```typescript
// Estrutura:
// 1. Back button (← Voltar para lista)
// 2. PageHeader (title="Processo {rubrica} — {periodo}", badge de status)
// 3. Grid de dados: rubrica, período, verba, total execuções, analista
// 4. Timeline de transições (criadoEm, calculadoEm, aprovadoEm, finalizadoEm)
// 5. Se cancelado: justificativa e data
// 6. ProcessoActions (botões por estado)
// 7. CancelarModal + FinalizarModal (controlled com isOpen state)

const { id } = useParams<{ id: string }>();
const { data: processo, isLoading } = useProcesso(id!);
const calcular = useCalcularProcesso();
const aprovar = useAprovarProcesso();
const finalizar = useFinalizarProcesso();
const cancelar = useCancelarProcesso();

const [cancelarOpen, setCancelarOpen] = useState(false);
const [finalizarOpen, setFinalizarOpen] = useState(false);
```

#### CriarProcessoPage — Criação

```typescript
// Estrutura:
// 1. Back button
// 2. PageHeader (title="Novo Processo de Distribuição")
// 3. DisponibilidadeList (itens clicáveis)
// 4. Se lista vazia: mensagem "Nenhuma combinação disponível"
// 5. Click → confirma → cria → navega para detalhes

const { data: disponiveis, isLoading } = useDisponiveis();
const criar = useCriarProcesso();
const navigate = useNavigate();

const handleSelect = async (item: Disponibilidade) => {
  const processo = await criar.mutateAsync({
    rubricaSigla: item.rubrica.sigla,
    periodo: item.periodo,
  });
  navigate(`/distribuicao/processos/${processo.id}`);
};
```

### Roteamento

```typescript
// features/distribuicao/index.tsx (MODIFICAR)
import { Route, Routes } from 'react-router-dom';
import { RubricasPage } from './rubricas/pages/RubricasPage';
import { ProcessosPage } from './processos/pages/ProcessosPage';
import { ProcessoDetailPage } from './processos/pages/ProcessoDetailPage';
import { CriarProcessoPage } from './processos/pages/CriarProcessoPage';

export default function DistribuicaoRoutes() {
  return (
    <Routes>
      <Route path="rubricas" element={<RubricasPage />} />
      <Route path="processos" element={<ProcessosPage />} />
      <Route path="processos/novo" element={<CriarProcessoPage />} />
      <Route path="processos/:id" element={<ProcessoDetailPage />} />
    </Routes>
  );
}
```

### Sidebar

```typescript
// Adicionar sub-item "Processos" ao item Distribuição existente
// Path: /distribuicao/processos
// Icon: reutilizar ou adicionar novo ícone
```

---

## Análise de Impacto

| Componente | Tipo | Descrição | Risco |
|---|---|---|---|
| `apiDistribuicaoClient.ts` | Modificar | Adicionar `apiPostDist` (POST genérico com auth) | Baixo |
| `features/distribuicao/index.tsx` | Modificar | Adicionar 3 rotas | Baixo |
| `Sidebar.tsx` | Modificar | Adicionar sub-item "Processos" | Baixo |
| F01 (rubricas) | Nenhum | Módulo independente, sem impacto | — |

---

## Abordagem de Testes

Esta Tech Spec foca na implementação. Testes frontend (se necessários) seguiriam o padrão do projeto:

| Tipo | Ferramenta | Cobertura |
|---|---|---|
| Tipo checking | `npx tsc --noEmit` | Todos os arquivos .ts/.tsx |
| Build | `npm run build` | Compilation + bundling |
| E2E (futuro) | Playwright | Fluxo completo criar → aprovar → finalizar |

---

## Sequenciamento de Desenvolvimento

### Ordem de Construção

1. **Tipos** — `processo.ts` (foundation para tudo)
2. **API client** — Adicionar `apiPostDist` ao client existente + `processosApi.ts`
3. **Hooks de leitura** — `useProcessos`, `useProcesso`, `useDisponiveis`
4. **Componentes base** — `ProcessoStatusBadge`, `ProcessosFilters`
5. **Página de listagem** — `ProcessosPage` + `ProcessosTable` + `Pagination`
6. **Hooks de mutação** — `useProcessoMutations` (todas as mutations)
7. **Componentes de ação** — `ProcessoActions`, `CancelarModal`, `FinalizarModal`
8. **Página de detalhes** — `ProcessoDetailPage` (com ações e modais)
9. **Página de criação** — `CriarProcessoPage` + `DisponibilidadeList`
10. **Roteamento + sidebar** — rotas e navegação

### Dependência do Backend

O frontend pode ser desenvolvido em paralelo com o backend usando mock server:
```bash
npx @stoplight/prism-cli mock tasks/distribuicao/prd-gestao-processos/api-contract.yaml
```

---

## Inventário de Artefatos

### Arquivos a Criar

| Caminho | Tipo | Descrição |
|---|---|---|
| `frontend/src/features/distribuicao/processos/types/processo.ts` | Tipo | Interfaces TS (Processo, StatusProcesso, Filtros, Requests, Responses) |
| `frontend/src/features/distribuicao/processos/api/processosApi.ts` | API | 8 funções fetch (listar, buscar, disponiveis, criar, calcular, aprovar, finalizar, cancelar) |
| `frontend/src/features/distribuicao/processos/hooks/useProcessos.ts` | Hook | useQuery listagem paginada com filtros + keepPreviousData |
| `frontend/src/features/distribuicao/processos/hooks/useProcesso.ts` | Hook | useQuery detalhe por ID |
| `frontend/src/features/distribuicao/processos/hooks/useDisponiveis.ts` | Hook | useQuery combinações disponíveis |
| `frontend/src/features/distribuicao/processos/hooks/useProcessoMutations.ts` | Hook | 5 useMutation (criar, calcular, aprovar, finalizar, cancelar) com invalidação |
| `frontend/src/features/distribuicao/processos/components/ProcessoStatusBadge.tsx` | Componente | Badge colorido por status (Record mapping) |
| `frontend/src/features/distribuicao/processos/components/ProcessosFilters.tsx` | Componente | Select rubrica + input período + multi-select status + limpar |
| `frontend/src/features/distribuicao/processos/components/ProcessosTable.tsx` | Componente | Tabela com linhas clicáveis, badges, formatação de valores |
| `frontend/src/features/distribuicao/processos/components/ProcessoActions.tsx` | Componente | Botões condicionais por estado (Calcular/Aprovar/Finalizar/Cancelar) |
| `frontend/src/features/distribuicao/processos/components/DisponibilidadeList.tsx` | Componente | Cards/lista de combinações disponíveis clicáveis |
| `frontend/src/features/distribuicao/processos/components/CancelarModal.tsx` | Componente | Modal com textarea justificativa (min 10 chars) + contador |
| `frontend/src/features/distribuicao/processos/components/FinalizarModal.tsx` | Componente | Modal confirmação irreversível (texto + botão danger) |
| `frontend/src/features/distribuicao/processos/pages/ProcessosPage.tsx` | Página | Listagem com filtros + paginação + PageHeader com botão "Novo" |
| `frontend/src/features/distribuicao/processos/pages/ProcessoDetailPage.tsx` | Página | Detalhes + timeline transições + ações + modais |
| `frontend/src/features/distribuicao/processos/pages/CriarProcessoPage.tsx` | Página | Seleção de disponíveis → criação → redirect |
| `frontend/src/features/distribuicao/processos/index.ts` | Barrel | Exports públicos |

### Arquivos a Modificar

| Caminho | Alteração |
|---|---|
| `frontend/src/shared/services/apiDistribuicaoClient.ts` | Adicionar `apiPostDist<T>(path, body)` com auth token |
| `frontend/src/features/distribuicao/index.tsx` | Adicionar 3 rotas: `/processos`, `/processos/novo`, `/processos/:id` |
| `frontend/src/shared/components/layout/sidebar/Sidebar.tsx` | Adicionar sub-item "Processos" com path `/distribuicao/processos` |

### Arquivos de Referência (não alterar)

| Caminho | Motivo |
|---|---|
| `frontend/src/features/arrecadacao/pagamentos/pages/PagamentosPage.tsx` | Padrão listagem com filtros + paginação |
| `frontend/src/features/arrecadacao/pagamentos/components/PagamentosFilters.tsx` | Padrão de filtros com reset |
| `frontend/src/features/arrecadacao/pagamentos/hooks/useEstornarPagamento.ts` | Padrão de useMutation com invalidação |
| `frontend/src/features/arrecadacao/pagamentos/components/EstornarPagamentoModal.tsx` | Padrão de modal com textarea + validação |
| `frontend/src/features/arrecadacao/licencas/components/StatusBadgeLicenca.tsx` | Padrão de badge por status |
| `frontend/src/features/arrecadacao/licencas/components/AlterarStatusModal.tsx` | Padrão de modal de ação destrutiva |
| `frontend/src/features/distribuicao/rubricas/` | Padrão feature module distribuicao (F01) |
| `frontend/src/shared/components/ui/` | Componentes compartilhados (Modal, Badge, Table, Pagination, Select, Button, PageHeader) |
| `tasks/distribuicao/prd-gestao-processos/api-contract.yaml` | Contrato de API — fonte de verdade para tipos e endpoints |

---

*Tech Spec Frontend gerada com a skill `flow-techspec-creator`. Para gerar as tarefas de implementação, use a skill `flow-task-creator` fornecendo este arquivo e a techspec backend como contexto.*
