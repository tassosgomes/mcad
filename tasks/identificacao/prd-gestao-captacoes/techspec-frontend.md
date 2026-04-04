# Especificação Técnica Frontend — F01: Gestão de Captações

> **PRD:** `tasks/prd-gestao-captacoes/prd.md`
> **API Contract:** `tasks/prd-gestao-captacoes/api-contract.yaml`
> **TechSpec Backend:** `tasks/prd-gestao-captacoes/techspec.md`
> **Domínio:** Identificação (D02)
> **Última revisão:** 2026-04-02

---

## Resumo Executivo

Esta TechSpec detalha a implementação do módulo frontend de Identificação no SPA React/Vite existente. O módulo segue os mesmos padrões do Cadastro: feature-based modules, TanStack React Query para server state, CSS Modules para estilização, OIDC para autenticação, e componentes de domínio (tabela, formulário, filtros) com composição de shared UI components.

A feature cria um novo módulo `features/identificacao/captacoes/` com 3 pages, 4 components, 6 hooks, 1 API client e tipos TypeScript derivados do `api-contract.yaml`. Antes da implementação dos componentes, mockups obrigatórios devem ser criados no Stitch.

---

## Stitch — Mockup Obrigatório

| Campo | Valor |
|-------|-------|
| **Projeto** | mcad |
| **ID** | `533156784329699726` |

**Telas a desenhar antes da implementação:**

| # | Tela | Descrição | Dados de exemplo |
|---|------|-----------|------------------|
| 1 | Listagem de Captações | Tabela com filtros (rubrica, período, status, responsável), sort, paginação, botões de ação | 5-8 captações com status variados, diferentes rubricas |
| 2 | Detalhe de Captação | Header com status badge, dados da captação, resumo de execuções (contadores zerados nesta fase), ações condicionais | Captação ABERTA de TV Aberta com dados preenchidos |
| 3 | Formulário de Criação/Edição | Dropdown de rubrica (com indicador de classificação), date picker, campo texto livre, botões salvar/cancelar | Dropdown com 7 rubricas, ícone ao lado de rubricas audiovisuais |
| 4 | Dialog de Confirmação de Exclusão | Modal com aviso de exclusão, contador de execuções que serão removidas, botões confirmar/cancelar | "Esta captação possui 42 execuções que também serão removidas" |

**Dados de exemplo para mockups** (extraídos do api-contract.yaml):
```json
{
  "captacao": {
    "id": "c1d2e3f4-5678-90ab-cdef-123456789012",
    "rubrica": { "sigla": "TV_ABERTA", "nome": "TV Aberta", "exigeClassificacao": true },
    "periodo": "2026-01-15",
    "usuarioDeMusica": "TV Globo - Rede Nacional",
    "status": "ABERTA",
    "analistaResponsavel": { "nome": "Maria Silva" }
  },
  "rubricas": [
    { "sigla": "RADIO", "nome": "Rádio AM/FM", "exigeClassificacao": false },
    { "sigla": "TV_ABERTA", "nome": "TV Aberta", "exigeClassificacao": true },
    { "sigla": "TV_FECHADA", "nome": "TV Fechada", "exigeClassificacao": true },
    { "sigla": "CINEMA", "nome": "Cinema", "exigeClassificacao": true },
    { "sigla": "VOD", "nome": "Streaming Vídeo (VOD)", "exigeClassificacao": true },
    { "sigla": "STREAMING_AUDIO", "nome": "Streaming Áudio", "exigeClassificacao": false },
    { "sigla": "SHOW", "nome": "Show", "exigeClassificacao": false }
  ]
}
```

---

## Arquitetura do Módulo

### Estrutura de Pastas

```
frontend/src/features/identificacao/
├── index.tsx                               # Rotas do módulo Identificação
└── captacoes/
    ├── index.ts                            # Barrel export (apenas pages)
    ├── types/
    │   └── captacao.ts                     # Interfaces TypeScript
    ├── api/
    │   └── captacoesApi.ts                 # Chamadas HTTP
    ├── hooks/
    │   ├── useRubricas.ts                  # GET /rubricas (cache longo)
    │   ├── useCaptacoes.ts                 # GET /captacoes (lista com filtros)
    │   ├── useCaptacao.ts                  # GET /captacoes/{id} (detalhe)
    │   ├── useCreateCaptacao.ts            # POST /captacoes
    │   ├── useUpdateCaptacao.ts            # PUT /captacoes/{id}
    │   └── useDeleteCaptacao.ts            # DELETE /captacoes/{id}
    ├── pages/
    │   ├── CaptacoesPage.tsx               # Listagem com filtros
    │   ├── CaptacaoCreatePage.tsx          # Criação
    │   └── CaptacaoDetailPage.tsx          # Detalhe + edição inline
    └── components/
        ├── CaptacoesTable.tsx              # Tabela de captações
        ├── CaptacoesTable.module.css
        ├── CaptacaoForm.tsx                # Formulário (criação + edição)
        ├── CaptacaoForm.module.css
        ├── CaptacaoFilters.tsx             # Filtros com debounce
        ├── CaptacaoFilters.module.css
        ├── DeleteCaptacaoModal.tsx          # Dialog de confirmação
        └── DeleteCaptacaoModal.module.css
```

---

## Tipos TypeScript

Derivados diretamente do `api-contract.yaml`:

```typescript
// types/captacao.ts

// ── Enums ──
export type StatusCaptacao = 'ABERTA' | 'FECHADA' | 'CANCELADA';

// ── Entidades ──
export interface Rubrica {
  id: string;
  sigla: string;
  nome: string;
  exigeClassificacao: boolean;
}

export interface AnalistaResumo {
  id: string;
  nome: string;
}

export interface ResumoExecucoes {
  total: number;
  identificadas: number;
  pendentes: number;
}

export interface Captacao {
  id: string;
  rubrica: Rubrica;
  periodo: string;           // "YYYY-MM-DD"
  usuarioDeMusica: string;
  status: StatusCaptacao;
  analistaResponsavel: AnalistaResumo;
  criadoEm: string;         // ISO 8601
  atualizadoEm: string;     // ISO 8601
}

export interface CaptacaoDetalhe extends Captacao {
  resumoExecucoes: ResumoExecucoes;
}

// ── Requests ──
export interface CriarCaptacaoRequest {
  rubricaId: string;
  periodo: string;           // "YYYY-MM-DD"
  usuarioDeMusica: string;
}

export interface AtualizarCaptacaoRequest {
  rubricaId: string;
  periodo: string;           // "YYYY-MM-DD"
  usuarioDeMusica: string;
}

// ── Responses ──
export interface CaptacaoListResponse {
  data: Captacao[];
  pagination: {
    page: number;
    size: number;
    total: number;
    totalPages: number;
  };
}

export interface RubricaListResponse {
  data: Rubrica[];
}

// ── Filtros ──
export interface CaptacaoFiltros {
  page: number;
  size: number;
  sort?: string;
  rubricaId?: string;
  periodoInicio?: string;    // "YYYY-MM-DD"
  periodoFim?: string;       // "YYYY-MM-DD"
  status?: StatusCaptacao;
  analistaResponsavelId?: string;
}
```

---

## Camada de API

```typescript
// api/captacoesApi.ts
import { apiGet, apiPost, apiPut, apiDelete } from '@services/apiClient';
import type {
  CaptacaoListResponse, CaptacaoDetalhe, Captacao,
  CriarCaptacaoRequest, AtualizarCaptacaoRequest,
  CaptacaoFiltros, RubricaListResponse,
} from '../types/captacao';

const BASE = '/rubricas';
const CAPTACOES = '/captacoes';

// ── Rubricas ──
export function getRubricas(): Promise<RubricaListResponse> {
  return apiGet<RubricaListResponse>(BASE);
}

// ── Captações ──
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
  return apiGet<CaptacaoListResponse>(`${CAPTACOES}?${params}`);
}

export function getCaptacaoById(id: string): Promise<CaptacaoDetalhe> {
  return apiGet<CaptacaoDetalhe>(`${CAPTACOES}/${id}`);
}

export function criarCaptacao(data: CriarCaptacaoRequest): Promise<Captacao> {
  return apiPost<Captacao>(CAPTACOES, data);
}

export function atualizarCaptacao(id: string, data: AtualizarCaptacaoRequest): Promise<Captacao> {
  return apiPut<Captacao>(`${CAPTACOES}/${id}`, data);
}

export function excluirCaptacao(id: string): Promise<void> {
  return apiDelete(`${CAPTACOES}/${id}`);
}
```

**Nota:** A `BASE_URL` do apiClient precisa suportar múltiplos backends. Ver seção "Pontos de Integração".

---

## Hooks React Query

### useRubricas — Cache longo (dados estáticos)

```typescript
// hooks/useRubricas.ts
export function useRubricas() {
  return useQuery({
    queryKey: ['rubricas'],
    queryFn: getRubricas,
    staleTime: Infinity,              // Nunca re-fetch automático — dados seed
    gcTime: 1000 * 60 * 60,          // Mantém em cache por 1h
    select: (data) => data.data,      // Extrai array diretamente
  });
}
```

### useCaptacoes — Lista com filtros

```typescript
// hooks/useCaptacoes.ts
export function useCaptacoes(filtros: CaptacaoFiltros) {
  return useQuery({
    queryKey: ['captacoes', filtros],
    queryFn: () => getCaptacoes(filtros),
    placeholderData: keepPreviousData,
  });
}
```

### useCaptacao — Detalhe

```typescript
// hooks/useCaptacao.ts
export function useCaptacao(id?: string) {
  return useQuery({
    queryKey: ['captacoes', id],
    queryFn: () => getCaptacaoById(id!),
    enabled: !!id,
  });
}
```

### useCreateCaptacao — Mutação de criação

```typescript
// hooks/useCreateCaptacao.ts
export function useCreateCaptacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: criarCaptacao,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['captacoes'] });
    },
  });
}
```

### useUpdateCaptacao — Mutação de atualização

```typescript
// hooks/useUpdateCaptacao.ts
export function useUpdateCaptacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AtualizarCaptacaoRequest }) =>
      atualizarCaptacao(id, data),
    onSuccess: (result, variables) => {
      queryClient.setQueryData(['captacoes', variables.id], result);
      queryClient.invalidateQueries({ queryKey: ['captacoes'] });
    },
  });
}
```

### useDeleteCaptacao — Mutação de exclusão

```typescript
// hooks/useDeleteCaptacao.ts
export function useDeleteCaptacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: excluirCaptacao,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['captacoes'] });
    },
  });
}
```

---

## Design de Páginas

### CaptacoesPage.tsx — Listagem

**Responsabilidades:**
- Estado de filtros (`CaptacaoFiltros`) com defaults: `page: 1, size: 20, sort: '-periodo'`
- Chama `useCaptacoes(filtros)` para dados
- Renderiza `CaptacaoFilters` + `CaptacoesTable` + `Pagination`
- Gerencia modal de exclusão (`DeleteCaptacaoModal`)
- Verifica permissão via `useAuth().hasRole('analista-identificacao')` para exibir botão "Nova Captação"
- Navega para `/identificacao/captacoes/nova` ao criar
- Navega para `/identificacao/captacoes/:id` ao clicar em uma captação

**Estados de UI:**

| Estado | Renderiza |
|--------|-----------|
| Loading | `<Loading />` |
| Erro | `<ErrorState onRetry={refetch} />` |
| Lista vazia | Empty state dentro de `CaptacoesTable` |
| Dados | Tabela + Paginação |

**Ações condicionais:**

| Condição | Ação disponível |
|----------|-----------------|
| `canWrite` | Botão "Nova Captação" no header |
| `canWrite && captacao.analistaResponsavel.id === userId` | Botões editar/excluir na tabela |
| `captacao.status === 'ABERTA'` | Botões editar/excluir habilitados |
| `captacao.status !== 'ABERTA'` | Botões editar/excluir desabilitados |

---

### CaptacaoCreatePage.tsx — Criação

**Responsabilidades:**
- Renderiza `CaptacaoForm` sem `initialData`
- Chama `useCreateCaptacao()` no submit
- Exibe toast de sucesso/erro
- Navega para `/identificacao/captacoes` após sucesso
- Botão de voltar no header

**Tratamento de erros específicos:**

| Código | code | Ação no UI |
|--------|------|------------|
| 409 | `CAPTACAO_DUPLICADA` | Toast error com `detail` do ProblemDetails: "Já existe uma captação ativa para TV Aberta em 2026-01-15" |
| 400 | `VALIDATION_ERROR` | Toast error genérico |

---

### CaptacaoDetailPage.tsx — Detalhe + Edição

**Responsabilidades:**
- Busca captação via `useCaptacao(id)` com `useParams`
- Renderiza header com: título (rubrica + período), badge de status, ações
- Renderiza `CaptacaoForm` com `initialData` para edição
- Exibe `ResumoExecucoes` como cards de contadores (total, identificadas, pendentes)
- Gerencia exclusão com `DeleteCaptacaoModal`
- Verifica propriedade: `canEdit = canWrite && captacao.analistaResponsavel.id === userId`

**Layout:**

```
┌────────────────────────────────────────────────┐
│ ← Captações                                     │
├────────────────────────────────────────────────┤
│ TV Aberta — 15/01/2026          [ABERTA] [Excluir]│
├────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│ │ Total    │ │ Identif. │ │ Pendentes│        │
│ │    150   │ │     142  │ │       8  │        │
│ └──────────┘ └──────────┘ └──────────┘        │
├────────────────────────────────────────────────┤
│ [CaptacaoForm — edição]                        │
│   Rubrica: [TV Aberta ▼] (desabilitado se      │
│             tem execuções)                      │
│   Período: [2026-01-15]                        │
│   Usuário de Música: [TV Globo - Rede Nacional]│
│   [Cancelar] [Salvar Alterações]               │
└────────────────────────────────────────────────┘
```

**Tratamento de erros específicos:**

| Código | code | Ação no UI |
|--------|------|------------|
| 409 | `CAPTACAO_DUPLICADA` | Toast error com `detail` |
| 409 | `RUBRICA_BLOQUEADA` | Toast error: "Não é possível alterar a rubrica..." |
| 422 | `STATUS_INVALIDO` | Toast error: "Apenas captações ABERTAS podem ser editadas" |
| 403 | `FORBIDDEN` | Toast error: "Apenas o analista responsável pode modificar" |

---

## Design de Componentes

### CaptacoesTable.tsx

**Props:**
```typescript
interface CaptacoesTableProps {
  data: Captacao[];
  canWrite: boolean;
  currentUserId: string;
  sort: string;
  onSortChange: (sort: string) => void;
  onView: (id: string) => void;
  onDelete: (captacao: Captacao) => void;
}
```

**Colunas:**

| Coluna | Campo | Sortável | Formatação |
|--------|-------|----------|------------|
| Rubrica | `rubrica.nome` | Sim (`rubrica`) | Badge com cor por tipo |
| Período | `periodo` | Sim (`periodo`) | `dd/MM/yyyy` (date-fns ou manual) |
| Usuário de Música | `usuarioDeMusica` | Não | Texto truncado (max 40 chars) |
| Status | `status` | Não | Badge: ABERTA=accent, FECHADA=success, CANCELADA=muted |
| Responsável | `analistaResponsavel.nome` | Não | Texto |
| Ações | — | — | Ícones: Eye (ver), Trash2 (excluir) |

**Regras de exibição de ações:**
- Ícone de view: sempre visível
- Ícone de excluir: visível somente se `canWrite && captacao.analistaResponsavel.id === currentUserId && captacao.status === 'ABERTA'`

**Badge de rubrica — cores sugeridas:**

| Grupo | Rubricas | Variante |
|-------|----------|----------|
| Audiovisual | TV Aberta, TV Fechada, Cinema, VOD | `accent` |
| Áudio | Rádio AM/FM, Streaming Áudio | `secondary` |
| Ao vivo | Show | `warning` |

---

### CaptacaoForm.tsx

**Props:**
```typescript
interface CaptacaoFormProps {
  initialData?: CaptacaoDetalhe;
  temExecucoes?: boolean;             // Se true, rubrica é read-only
  onSubmit: (data: CriarCaptacaoRequest | AtualizarCaptacaoRequest) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}
```

**Campos:**

| Campo | Componente | Obrigatório | Observações |
|-------|------------|-------------|-------------|
| Rubrica | `<Select>` com dados de `useRubricas()` | Sim | Disabled se `temExecucoes` ou status !== ABERTA. Mostrar ícone/label "(Classificação obrigatória)" para rubricas audiovisuais |
| Período | `<input type="date">` | Sim | Formato `YYYY-MM-DD` nativo do HTML5 |
| Usuário de Música | `<TextInput>` | Sim | maxLength 255, placeholder "Ex: Rádio Globo SP, TV Globo, Netflix BR" |

**Validação client-side:**

| Campo | Regra | Mensagem |
|-------|-------|----------|
| Rubrica | Não pode ser vazio | "Selecione uma rubrica" |
| Período | Não pode ser vazio | "Informe o período (data)" |
| Usuário de Música | Não pode ser vazio, max 255 | "Informe o usuário de música" |

**Estado read-only:**
- Se `initialData?.status !== 'ABERTA'` → todos os campos disabled, botões de ação ocultos
- Se `temExecucoes === true` → apenas campo rubrica disabled com tooltip explicativo

---

### CaptacaoFilters.tsx

**Props:**
```typescript
interface CaptacaoFiltersProps {
  filtros: CaptacaoFiltros;
  onChange: (filtros: CaptacaoFiltros) => void;
}
```

**Filtros:**

| Filtro | Componente | Comportamento |
|--------|------------|---------------|
| Rubrica | `<Select>` de `useRubricas()` | Seleção imediata, reset page para 1 |
| Período início | `<input type="date">` | Seleção imediata, reset page |
| Período fim | `<input type="date">` | Seleção imediata, reset page |
| Status | `<Select>` com ABERTA/FECHADA/CANCELADA | Seleção imediata, reset page |
| Responsável | `<TextInput>` (futuro: autocomplete) | Debounce 300ms, reset page |

**Layout:** horizontal, inline com a tabela (flexbox row wrap).

---

### DeleteCaptacaoModal.tsx

**Props:**
```typescript
interface DeleteCaptacaoModalProps {
  captacao: Captacao | null;
  totalExecucoes?: number;
  isOpen: boolean;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}
```

**Conteúdo:**
- Título: "Excluir Captação"
- Mensagem: "Tem certeza que deseja excluir a captação de **{rubrica.nome}** em **{periodo}**?"
- Se `totalExecucoes > 0`: aviso adicional "Esta captação possui **{N} execuções** que também serão removidas."
- Botões: "Cancelar" (secondary) + "Excluir" (danger, com loading state)

---

## Roteamento

### Rotas do Módulo

```typescript
// features/identificacao/index.tsx
import { Routes, Route } from 'react-router-dom';
import { CaptacoesPage, CaptacaoCreatePage, CaptacaoDetailPage } from './captacoes';

export default function IdentificacaoRoutes() {
  return (
    <Routes>
      <Route path="captacoes" element={<CaptacoesPage />} />
      <Route path="captacoes/nova" element={<CaptacaoCreatePage />} />
      <Route path="captacoes/:id" element={<CaptacaoDetailPage />} />
    </Routes>
  );
}
```

### Integração no Router Principal

```typescript
// app/router/routes.tsx — adicionar:
const IdentificacaoRoutes = lazy(() => import('@features/identificacao'));

// Dentro do children do layout:
{
  path: 'identificacao/*',
  element: (
    <Suspense fallback={<Loading />}>
      <IdentificacaoRoutes />
    </Suspense>
  )
}
```

### Navegação na Sidebar

```typescript
// Sidebar.tsx — atualizar navigation array:
{
  label: 'Identificação',
  icon: Search,              // Lucide icon
  basePath: '/identificacao',
  disabled: false,           // Mudar de true para false
  children: [
    { label: 'Captações', path: '/identificacao/captacoes' },
  ],
}
```

---

## Pontos de Integração

### API Client — Múltiplos Backends

O apiClient atual usa uma única `BASE_URL`. Para suportar o serviço de Identificação em porta diferente (`:5100`), há duas opções:

**Opção A — Variável de ambiente separada (recomendada para PoC):**
```typescript
// captacoesApi.ts
const IDENTIFICACAO_BASE_URL = import.meta.env.VITE_IDENTIFICACAO_API_BASE_URL
  || 'http://localhost:5100/api/v1';

export function getCaptacoes(filtros: CaptacaoFiltros): Promise<CaptacaoListResponse> {
  // Usar fetch direto com IDENTIFICACAO_BASE_URL em vez do apiGet genérico
}
```

Criar um `apiIdentificacaoClient.ts` que reutiliza a lógica de auth mas aponta para a URL do Identificação.

**Opção B — BFF/Gateway (futuro):**
Um API Gateway ou BFF unificaria os endpoints. Fora do escopo desta feature.

**Decisão:** Opção A — criar `apiIdentificacaoClient.ts` com a mesma estrutura do `apiClient.ts` mas apontando para `VITE_IDENTIFICACAO_API_BASE_URL`.

### Autenticação

- Mesmas roles verificadas via `useAuth().hasRole()`
- Roles desta feature: `analista-identificacao` (write), `consultor-identificacao` (read)
- O `userId` (sub claim) é obtido via `useAuth().user?.profile.sub`

---

## Análise de Impacto

| Componente Afetado | Tipo de Impacto | Descrição & Risco | Ação Requerida |
|---|---|---|---|
| `routes.tsx` | Adição de rota | Nova rota `/identificacao/*` com lazy loading. Baixo risco. | Apenas adicionar import e rota |
| `Sidebar.tsx` | Adição de item | Habilitar seção Identificação (disabled: false) + adicionar child "Captações". Baixo risco. | Modificar array `navigation` |
| `Header.tsx` | Possível adição | Se header tem breadcrumb ou título dinâmico, pode precisar de ajuste. Baixo risco. | Verificar se useDocumentTitle é suficiente |
| `.env.example` | Nova variável | `VITE_IDENTIFICACAO_API_BASE_URL`. Baixo risco. | Documentar |
| Bundle size | Adição | Novo chunk lazy-loaded. Sem impacto no carregamento inicial. | Verificar split com `vite build --report` |

---

## Abordagem de Testes

### Cenários de Teste Sugeridos

| Cenário | Tipo | Prioridade |
|---------|------|------------|
| Listagem renderiza captações corretamente | Component | Alta |
| Filtros alteram queryKey e resetam página | Hook | Alta |
| Formulário valida campos obrigatórios | Component | Alta |
| Rubrica desabilitada quando `temExecucoes` | Component | Alta |
| Botão excluir só aparece para dono + ABERTA | Component | Alta |
| Toast exibe mensagem de erro do ProblemDetails | Integration | Média |
| Erro 409 CAPTACAO_DUPLICADA exibe mensagem | Integration | Média |
| Navegação para detalhe funciona | Routing | Média |
| useRubricas usa `staleTime: Infinity` | Hook | Baixa |

**Framework:** Vitest + React Testing Library (seguir padrão do projeto se existir; caso contrário, configurar).

---

## Sequenciamento de Desenvolvimento

| # | Etapa | Dependência |
|---|-------|-------------|
| 1 | **Stitch mockups** — 4 telas | Nenhuma |
| 2 | **types/captacao.ts** — interfaces TypeScript | api-contract.yaml |
| 3 | **apiIdentificacaoClient.ts** — HTTP client para Identificação | apiClient.ts (referência) |
| 4 | **api/captacoesApi.ts** — funções de chamada HTTP | Etapa 2 + 3 |
| 5 | **hooks/** — 6 hooks React Query | Etapa 4 |
| 6 | **components/** — CaptacaoForm, CaptacoesTable, CaptacaoFilters, DeleteCaptacaoModal | Etapa 5 + mockups aprovados |
| 7 | **pages/** — CaptacoesPage, CaptacaoCreatePage, CaptacaoDetailPage | Etapa 6 |
| 8 | **index.tsx + routes.tsx + Sidebar** — integração de roteamento e navegação | Etapa 7 |
| 9 | **.env.example** — documentar variável | Etapa 3 |

---

## Inventário de Artefatos

### Arquivos a Criar

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| `frontend/src/features/identificacao/index.tsx` | Router | Rotas do módulo Identificação |
| `frontend/src/features/identificacao/captacoes/index.ts` | Barrel | Export das pages |
| `frontend/src/features/identificacao/captacoes/types/captacao.ts` | Types | Interfaces derivadas do api-contract |
| `frontend/src/shared/services/apiIdentificacaoClient.ts` | Service | HTTP client apontando para Identificação API |
| `frontend/src/features/identificacao/captacoes/api/captacoesApi.ts` | API | Funções de chamada HTTP |
| `frontend/src/features/identificacao/captacoes/hooks/useRubricas.ts` | Hook | Query de rubricas (cache longo) |
| `frontend/src/features/identificacao/captacoes/hooks/useCaptacoes.ts` | Hook | Query de listagem com filtros |
| `frontend/src/features/identificacao/captacoes/hooks/useCaptacao.ts` | Hook | Query de detalhe |
| `frontend/src/features/identificacao/captacoes/hooks/useCreateCaptacao.ts` | Hook | Mutation de criação |
| `frontend/src/features/identificacao/captacoes/hooks/useUpdateCaptacao.ts` | Hook | Mutation de atualização |
| `frontend/src/features/identificacao/captacoes/hooks/useDeleteCaptacao.ts` | Hook | Mutation de exclusão |
| `frontend/src/features/identificacao/captacoes/pages/CaptacoesPage.tsx` | Page | Listagem com filtros e tabela |
| `frontend/src/features/identificacao/captacoes/pages/CaptacaoCreatePage.tsx` | Page | Formulário de criação |
| `frontend/src/features/identificacao/captacoes/pages/CaptacaoDetailPage.tsx` | Page | Detalhe + edição |
| `frontend/src/features/identificacao/captacoes/components/CaptacoesTable.tsx` | Component | Tabela de captações |
| `frontend/src/features/identificacao/captacoes/components/CaptacoesTable.module.css` | Style | CSS Module da tabela |
| `frontend/src/features/identificacao/captacoes/components/CaptacaoForm.tsx` | Component | Formulário criação/edição |
| `frontend/src/features/identificacao/captacoes/components/CaptacaoForm.module.css` | Style | CSS Module do formulário |
| `frontend/src/features/identificacao/captacoes/components/CaptacaoFilters.tsx` | Component | Filtros com debounce |
| `frontend/src/features/identificacao/captacoes/components/CaptacaoFilters.module.css` | Style | CSS Module dos filtros |
| `frontend/src/features/identificacao/captacoes/components/DeleteCaptacaoModal.tsx` | Component | Dialog de confirmação de exclusão |
| `frontend/src/features/identificacao/captacoes/components/DeleteCaptacaoModal.module.css` | Style | CSS Module do modal |

### Arquivos a Modificar

| Caminho | Alteração |
|---------|-----------|
| `frontend/src/app/router/routes.tsx` | Adicionar rota `/identificacao/*` com lazy loading |
| `frontend/src/shared/components/layout/sidebar/Sidebar.tsx` | Habilitar seção Identificação + adicionar child "Captações" |
| `frontend/.env.example` | Adicionar `VITE_IDENTIFICACAO_API_BASE_URL=http://localhost:5100/api/v1` |

### Arquivos de Referência (não alterar)

| Caminho | Motivo |
|---------|--------|
| `frontend/src/features/cadastro/index.tsx` | Padrão de rotas de feature module |
| `frontend/src/features/cadastro/obras/pages/ObrasPage.tsx` | Padrão de page de listagem |
| `frontend/src/features/cadastro/obras/pages/ObraDetailPage.tsx` | Padrão de page de detalhe |
| `frontend/src/features/cadastro/obras/components/ObrasTable.tsx` | Padrão de tabela de domínio |
| `frontend/src/features/cadastro/obras/components/ObraForm.tsx` | Padrão de formulário |
| `frontend/src/features/cadastro/obras/hooks/useObras.ts` | Padrão de hook de listagem |
| `frontend/src/features/cadastro/obras/hooks/useCreateObra.ts` | Padrão de hook de mutation |
| `frontend/src/features/cadastro/obras/api/obrasApi.ts` | Padrão de API client |
| `frontend/src/features/cadastro/obras/types/obra.ts` | Padrão de tipos |
| `frontend/src/shared/services/apiClient.ts` | Referência para apiIdentificacaoClient |
| `frontend/src/shared/components/ui/` | Shared UI components disponíveis |

---

*TechSpec Frontend gerada com a skill `flow-techspec-creator`. Para gerar as tarefas de implementação, use a skill `flow-task-creator` fornecendo ambas TechSpecs (backend + frontend) e o PRD.*
