# Tech Spec Frontend — F02: Gestão de Titulares

> **PRD:** `tasks/prd-gestao-titulares/prd.md`
> **API Contract:** `tasks/prd-gestao-titulares/api-contract.yaml`
> **Domínio:** Cadastro (D01)
> **Feature ID:** F02
> **Data:** 2026-03-30

---

## Resumo Executivo

Esta Tech Spec cobre a implementação frontend da feature F02 — a primeira feature com operações de escrita (CRUD) no SPA. Introduz padrões que serão reutilizados por todas as features futuras: **componentes de formulário** (TextInput, Select, FormField), **paginação server-side**, **filtros com debounce**, **ordenação clicável**, **validação inline de CPF/CNPJ**, **badges de status**, **modal de confirmação** e **toasts de feedback**.

A feature F01 (Associações) estabeleceu o padrão de leitura. F02 estende para CRUD completo, mantendo coerência com o design system `DESIGN.md` e os padrões da skill `react-architecture`.

## Skills de Referência

| Skill | Decisões Influenciadas |
|-------|------------------------|
| `react-architecture` | Estrutura de feature, path aliases, convenções de pastas |
| `frontend-design` | Design system Circuit Core Dark, componentes, princípios visuais |

---

## Stitch — Mockup Obrigatório

Antes de implementar, criar mockups das telas no Stitch para validação visual:

### Projeto Stitch

| Campo | Valor |
|-------|-------|
| **Projeto** | mcad |
| **ID** | `533156784329699726` |

### Screens a Criar

| # | Nome da Screen | Descrição | Componentes Chave |
|---|---------------|-----------|-------------------|
| 1 | **Titulares - Listagem** | Tabela paginada com filtros, ordenação, badges de status e tipo PF/PJ | PageHeader (com botão "Novo Titular"), filtros (nome, documento, associação, status), tabela paginada, badges, paginação |
| 2 | **Titulares - Formulário Criar** | Formulário de criação com seleção PF/PJ, validação inline CPF/CNPJ, dropdown de associação | FormField, TextInput, Select (tipo, associação, nacionalidade), validação inline, botões Cancelar/Salvar |
| 3 | **Titulares - Formulário Editar** | Mesmo layout do criar, com campos tipo e documento desabilitados (read-only) | Mesmos componentes + campos disabled para tipo/documento |
| 4 | **Titulares - Modal Excluir** | Confirmação de exclusão com nome do titular | Modal overlay, texto de confirmação, botões Cancelar/Excluir |

### Diretrizes Stitch

- Usar obrigatoriamente os tokens e princípios do `frontend/DESIGN.md`
- Design System: **Circuit Core Dark** (Asset: `b2bc911ef6b644fdac02168609989b83`)
- Referenciar a screen existente `28d9d5dde6be44c0b3b307bb311051c0` (Associações) para consistência de layout
- CPF/CNPJ exibido em `--font-mono` (JetBrains Mono)
- Badges de status: ATIVO (success), FALECIDO (muted), TRANSFERINDO (warning)
- Badge de tipo: PF (secondary), PJ (accent-subtle)
- Regra "No-Line" respeitada — separação por superfícies, não bordas

---

## Arquitetura do Sistema

### Estrutura de Pastas

```
frontend/src/
├── shared/
│   ├── components/
│   │   └── ui/
│   │       ├── text-input/              ← NOVO
│   │       │   ├── TextInput.tsx
│   │       │   ├── TextInput.module.css
│   │       │   └── index.ts
│   │       ├── select/                  ← NOVO
│   │       │   ├── Select.tsx
│   │       │   ├── Select.module.css
│   │       │   └── index.ts
│   │       ├── form-field/              ← NOVO
│   │       │   ├── FormField.tsx
│   │       │   ├── FormField.module.css
│   │       │   └── index.ts
│   │       ├── badge/                   ← NOVO
│   │       │   ├── Badge.tsx
│   │       │   ├── Badge.module.css
│   │       │   └── index.ts
│   │       ├── button/                  ← NOVO
│   │       │   ├── Button.tsx
│   │       │   ├── Button.module.css
│   │       │   └── index.ts
│   │       ├── pagination/              ← NOVO
│   │       │   ├── Pagination.tsx
│   │       │   ├── Pagination.module.css
│   │       │   └── index.ts
│   │       ├── modal/                   ← NOVO
│   │       │   ├── Modal.tsx
│   │       │   ├── Modal.module.css
│   │       │   └── index.ts
│   │       ├── toast/                   ← NOVO
│   │       │   ├── Toast.tsx
│   │       │   ├── Toast.module.css
│   │       │   ├── ToastProvider.tsx
│   │       │   ├── useToast.ts
│   │       │   └── index.ts
│   │       ├── table/                   ← existente
│   │       ├── page-header/             ← existente
│   │       ├── loading/                 ← existente
│   │       └── error-state/             ← existente
│   ├── hooks/
│   │   ├── useDocumentTitle.ts          ← existente
│   │   └── useDebounce.ts              ← NOVO
│   └── services/
│       └── apiClient.ts                 ← MODIFICAR (adicionar apiPost, apiPut, apiDelete)
│
└── features/
    └── cadastro/
        ├── index.tsx                    ← MODIFICAR (adicionar rota titulares)
        ├── associacoes/                 ← existente
        └── titulares/                   ← NOVO
            ├── api/
            │   └── titularesApi.ts
            ├── components/
            │   ├── TitularesTable.tsx
            │   ├── TitularesTable.module.css
            │   ├── TitularesFilters.tsx
            │   ├── TitularesFilters.module.css
            │   ├── TitularForm.tsx
            │   ├── TitularForm.module.css
            │   ├── DeleteTitularModal.tsx
            │   └── DeleteTitularModal.module.css
            ├── hooks/
            │   ├── useTitulares.ts
            │   ├── useTitular.ts
            │   ├── useCreateTitular.ts
            │   ├── useUpdateTitular.ts
            │   └── useDeleteTitular.ts
            ├── pages/
            │   ├── TitularesPage.tsx
            │   ├── TitularesPage.module.css
            │   ├── TitularCreatePage.tsx
            │   ├── TitularEditPage.tsx
            │   └── TitularEditPage.module.css
            ├── utils/
            │   ├── cpfValidator.ts
            │   ├── cnpjValidator.ts
            │   └── documentFormatter.ts
            ├── types/
            │   └── titular.ts
            └── index.ts
```

### Decisões Arquiteturais

| Decisão | Justificativa |
|---------|---------------|
| Páginas separadas para Criar e Editar (não modal) | CRUD completo com formulário grande; modal seria apertado |
| Formulário como componente reutilizável `TitularForm` | Compartilhado entre Create e Edit; modo controlado por props |
| Filtros como componente separado `TitularesFilters` | Isolamento de responsabilidade; reutilizável se necessário |
| Validação CPF/CNPJ duplicada no frontend (utils) | Feedback imediato ao usuário; backend valida definitivamente |
| Mutations via TanStack Query `useMutation` | Invalidação automática de cache, loading/error states |
| Toast para feedback de ações | Não bloqueia fluxo; padrão UX consolidado |
| Modal para confirmação de exclusão | Ação destrutiva exige confirmação explícita |
| `useDebounce` para filtros de texto | Evita request a cada keystroke (300ms) |

---

## Design de Implementação

### Tipos (derivados do API Contract)

```typescript
// features/cadastro/titulares/types/titular.ts

export interface Titular {
  id: string;
  nome: string;
  tipo: 'PF' | 'PJ';
  documento: string;
  documentoFormatado: string;
  nacionalidade: string;
  caeIpi: string | null;
  associacao: AssociacaoResumo;
  status: TitularStatus;
  criadoEm: string;
  atualizadoEm: string;
}

export interface AssociacaoResumo {
  id: string;
  sigla: string;
  nome: string;
}

export type TitularStatus = 'ATIVO' | 'FALECIDO' | 'TRANSFERINDO';

export interface TitularListResponse {
  data: Titular[];
  pagination: Pagination;
}

export interface Pagination {
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export interface CriarTitularRequest {
  nome: string;
  tipo: 'PF' | 'PJ';
  documento: string;
  nacionalidade: string;
  associacaoId: string;
  caeIpi?: string | null;
}

export interface AtualizarTitularRequest {
  nome: string;
  nacionalidade: string;
  associacaoId: string;
  status: TitularStatus;
  caeIpi?: string | null;
}

export interface TitularFiltros {
  page: number;
  size: number;
  sort: string;
  nome?: string;
  documento?: string;
  associacaoId?: string;
  status?: TitularStatus;
}
```

### API Layer

```typescript
// features/cadastro/titulares/api/titularesApi.ts

import { apiGet, apiPost, apiPut, apiDelete } from '@services/apiClient';
import type {
  Titular, TitularListResponse,
  CriarTitularRequest, AtualizarTitularRequest, TitularFiltros
} from '../types/titular';

export function getTitulares(filtros: TitularFiltros): Promise<TitularListResponse> {
  const params = new URLSearchParams();
  params.set('page', String(filtros.page));
  params.set('size', String(filtros.size));
  if (filtros.sort) params.set('sort', filtros.sort);
  if (filtros.nome) params.set('nome', filtros.nome);
  if (filtros.documento) params.set('documento', filtros.documento);
  if (filtros.associacaoId) params.set('associacaoId', filtros.associacaoId);
  if (filtros.status) params.set('status', filtros.status);
  return apiGet<TitularListResponse>(`/titulares?${params}`);
}

export function getTitularById(id: string): Promise<Titular> {
  return apiGet<Titular>(`/titulares/${id}`);
}

export function criarTitular(data: CriarTitularRequest): Promise<Titular> {
  return apiPost<Titular>('/titulares', data);
}

export function atualizarTitular(id: string, data: AtualizarTitularRequest): Promise<Titular> {
  return apiPut<Titular>(`/titulares/${id}`, data);
}

export function excluirTitular(id: string): Promise<void> {
  return apiDelete(`/titulares/${id}`);
}
```

### API Client — Extensão para POST/PUT/DELETE

```typescript
// shared/services/apiClient.ts — adições

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => ({
      status: response.status, title: response.statusText,
    }));
    throw problem;
  }
  return response.json() as Promise<T>;
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => ({
      status: response.status, title: response.statusText,
    }));
    throw problem;
  }
  return response.json() as Promise<T>;
}

export async function apiDelete(path: string): Promise<void> {
  const response = await fetch(`${BASE_URL}${path}`, { method: 'DELETE' });
  if (!response.ok) {
    const problem = await response.json().catch(() => ({
      status: response.status, title: response.statusText,
    }));
    throw problem;
  }
}
```

### Hooks — TanStack Query

```typescript
// hooks/useTitulares.ts — listagem paginada
export function useTitulares(filtros: TitularFiltros) {
  return useQuery({
    queryKey: ['titulares', filtros],
    queryFn: () => getTitulares(filtros),
    placeholderData: keepPreviousData, // mantém dados anteriores durante refetch
  });
}

// hooks/useCreateTitular.ts — mutation
export function useCreateTitular() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: criarTitular,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['titulares'] });
    },
  });
}

// hooks/useDeleteTitular.ts — mutation
export function useDeleteTitular() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: excluirTitular,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['titulares'] });
    },
  });
}
```

### Validação CPF/CNPJ (Frontend Utils)

```typescript
// utils/cpfValidator.ts
export function isValidCpf(cpf: string): boolean {
  const limpo = cpf.replace(/\D/g, '');
  if (limpo.length !== 11) return false;
  // módulo 11 numérico (mesmo algoritmo do backend)
  // ...
}

// utils/cnpjValidator.ts
export function isValidCnpj(cnpj: string): boolean {
  const limpo = cnpj.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (limpo.length !== 14) return false;
  // módulo 11 com ASCII - 48 (conforme docs/validacoes/cnpj.md)
  // ...
}

// utils/documentFormatter.ts
export function formatCpf(cpf: string): string {
  return `${cpf.slice(0,3)}.${cpf.slice(3,6)}.${cpf.slice(6,9)}-${cpf.slice(9)}`;
}

export function formatCnpj(cnpj: string): string {
  // A1.B2C.3D4/1A2B-99
  return `${cnpj.slice(0,2)}.${cnpj.slice(2,5)}.${cnpj.slice(5,8)}/${cnpj.slice(8,12)}-${cnpj.slice(12)}`;
}
```

### Componentes de Página

#### TitularesPage (Listagem)

```typescript
export function TitularesPage() {
  const [filtros, setFiltros] = useState<TitularFiltros>({ page: 1, size: 20, sort: 'nome' });
  const { data, isLoading, error, refetch } = useTitulares(filtros);
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <PageHeader
        title="Titulares"
        description="Pessoas físicas e jurídicas titulares de direitos autorais"
        action={
          <Button variant="primary" onClick={() => navigate('/cadastro/titulares/novo')}>
            <Plus size={16} /> Novo Titular
          </Button>
        }
      />
      <TitularesFilters filtros={filtros} onChange={setFiltros} />
      {isLoading ? <Loading /> : error ? <ErrorState onRetry={refetch} /> : (
        <>
          <TitularesTable
            data={data!.data}
            sort={filtros.sort}
            onSortChange={(sort) => setFiltros(prev => ({ ...prev, sort, page: 1 }))}
            onEdit={(id) => navigate(`/cadastro/titulares/${id}/editar`)}
            onDelete={(titular) => setTitularParaExcluir(titular)}
          />
          <Pagination
            pagination={data!.pagination}
            onPageChange={(page) => setFiltros(prev => ({ ...prev, page }))}
          />
        </>
      )}
      <DeleteTitularModal ... />
    </div>
  );
}
```

#### TitularForm (Compartilhado entre Criar e Editar)

```typescript
interface TitularFormProps {
  initialData?: Titular;          // undefined = criação, preenchido = edição
  onSubmit: (data: CriarTitularRequest | AtualizarTitularRequest) => void;
  isSubmitting: boolean;
}

export function TitularForm({ initialData, onSubmit, isSubmitting }: TitularFormProps) {
  const isEditMode = !!initialData;
  // ...form state, validation, submission
}
```

---

## Novos Shared Components (Design System)

### Button

```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
  disabled?: boolean;
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
}
```

**Estilos (DESIGN.md):**
- `primary`: `--color-accent` background, `#fff` text, `--color-accent-hover` on hover
- `secondary`: `transparent` background, `--color-border` border, `--color-text-primary` text
- `danger`: `transparent` background, `--color-error` text/border
- `ghost`: sem border, hover com `--color-bg-elevated`

### TextInput

```typescript
interface TextInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  mask?: 'cpf' | 'cnpj';     // Formatação automática durante digitação
  mono?: boolean;              // JetBrains Mono para dados técnicos
}
```

### Select

```typescript
interface SelectProps<T> {
  label?: string;
  value: T | undefined;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}
```

### FormField (wrapper label + error)

```typescript
interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}
```

### Badge

```typescript
interface BadgeProps {
  variant: 'success' | 'warning' | 'muted' | 'accent' | 'secondary';
  children: ReactNode;
}
```

**Mapeamento de status/tipo para variant:**
- ATIVO → `success`
- FALECIDO → `muted`
- TRANSFERINDO → `warning`
- PF → `secondary`
- PJ → `accent`

### Pagination

```typescript
interface PaginationProps {
  pagination: { page: number; size: number; total: number; totalPages: number };
  onPageChange: (page: number) => void;
}
```

### Modal

```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}
```

### Toast (Provider Pattern)

```typescript
// ToastProvider wraps App
// useToast() retorna { showToast(message, variant) }
// Posição: bottom-right, auto-dismiss 5s
// Variants: success, error, warning
```

---

## Rotas

| Path | Página | Descrição |
|------|--------|-----------|
| `/cadastro/titulares` | TitularesPage | Listagem paginada com filtros |
| `/cadastro/titulares/novo` | TitularCreatePage | Formulário de criação |
| `/cadastro/titulares/:id/editar` | TitularEditPage | Formulário de edição |

```typescript
// features/cadastro/index.tsx — atualização
<Route path="titulares" element={<TitularesPage />} />
<Route path="titulares/novo" element={<TitularCreatePage />} />
<Route path="titulares/:id/editar" element={<TitularEditPage />} />
```

---

## Inventário de Artefatos

### Arquivos a Criar

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| **Shared — UI Components** | | |
| `shared/components/ui/text-input/TextInput.tsx` | Componente | Input com label, error, mask (CPF/CNPJ) |
| `shared/components/ui/text-input/TextInput.module.css` | Estilos | Tokens do DESIGN.md |
| `shared/components/ui/text-input/index.ts` | Export | Public API |
| `shared/components/ui/select/Select.tsx` | Componente | Dropdown com label, error, placeholder |
| `shared/components/ui/select/Select.module.css` | Estilos | Tokens do DESIGN.md |
| `shared/components/ui/select/index.ts` | Export | Public API |
| `shared/components/ui/form-field/FormField.tsx` | Componente | Wrapper: label + required + error message |
| `shared/components/ui/form-field/FormField.module.css` | Estilos | Tokens do DESIGN.md |
| `shared/components/ui/form-field/index.ts` | Export | Public API |
| `shared/components/ui/badge/Badge.tsx` | Componente | Badge com variantes de cor |
| `shared/components/ui/badge/Badge.module.css` | Estilos | Tokens do DESIGN.md |
| `shared/components/ui/badge/index.ts` | Export | Public API |
| `shared/components/ui/button/Button.tsx` | Componente | Botão com variantes (primary, secondary, danger, ghost) |
| `shared/components/ui/button/Button.module.css` | Estilos | Tokens do DESIGN.md |
| `shared/components/ui/button/index.ts` | Export | Public API |
| `shared/components/ui/pagination/Pagination.tsx` | Componente | Controles de paginação (prev/next, info) |
| `shared/components/ui/pagination/Pagination.module.css` | Estilos | Tokens do DESIGN.md |
| `shared/components/ui/pagination/index.ts` | Export | Public API |
| `shared/components/ui/modal/Modal.tsx` | Componente | Modal overlay com título, conteúdo, ações |
| `shared/components/ui/modal/Modal.module.css` | Estilos | Tokens do DESIGN.md |
| `shared/components/ui/modal/index.ts` | Export | Public API |
| `shared/components/ui/toast/Toast.tsx` | Componente | Toast notification |
| `shared/components/ui/toast/Toast.module.css` | Estilos | Tokens do DESIGN.md |
| `shared/components/ui/toast/ToastProvider.tsx` | Provider | Context + state management |
| `shared/components/ui/toast/useToast.ts` | Hook | showToast(message, variant) |
| `shared/components/ui/toast/index.ts` | Export | Public API |
| **Shared — Hooks** | | |
| `shared/hooks/useDebounce.ts` | Hook | Debounce genérico (300ms default) |
| **Feature — Titulares** | | |
| `features/cadastro/titulares/types/titular.ts` | Tipos | Interfaces derivadas do API Contract |
| `features/cadastro/titulares/api/titularesApi.ts` | API | CRUD functions (get, create, update, delete) |
| `features/cadastro/titulares/hooks/useTitulares.ts` | Hook | useQuery paginada com filtros |
| `features/cadastro/titulares/hooks/useTitular.ts` | Hook | useQuery por ID |
| `features/cadastro/titulares/hooks/useCreateTitular.ts` | Hook | useMutation criar |
| `features/cadastro/titulares/hooks/useUpdateTitular.ts` | Hook | useMutation atualizar |
| `features/cadastro/titulares/hooks/useDeleteTitular.ts` | Hook | useMutation excluir |
| `features/cadastro/titulares/components/TitularesTable.tsx` | Componente | Tabela com sort clicável, badges, ações |
| `features/cadastro/titulares/components/TitularesTable.module.css` | Estilos | Colunas, badges, ações |
| `features/cadastro/titulares/components/TitularesFilters.tsx` | Componente | Filtros: nome, documento, associação, status |
| `features/cadastro/titulares/components/TitularesFilters.module.css` | Estilos | Layout grid dos filtros |
| `features/cadastro/titulares/components/TitularForm.tsx` | Componente | Form compartilhado (criar/editar) |
| `features/cadastro/titulares/components/TitularForm.module.css` | Estilos | Layout do formulário |
| `features/cadastro/titulares/components/DeleteTitularModal.tsx` | Componente | Modal de confirmação |
| `features/cadastro/titulares/components/DeleteTitularModal.module.css` | Estilos | Modal |
| `features/cadastro/titulares/pages/TitularesPage.tsx` | Página | Listagem + filtros + paginação |
| `features/cadastro/titulares/pages/TitularesPage.module.css` | Estilos | Layout da página |
| `features/cadastro/titulares/pages/TitularCreatePage.tsx` | Página | Formulário de criação |
| `features/cadastro/titulares/pages/TitularEditPage.tsx` | Página | Formulário de edição |
| `features/cadastro/titulares/pages/TitularEditPage.module.css` | Estilos | Layout do formulário |
| `features/cadastro/titulares/utils/cpfValidator.ts` | Utility | Validação CPF módulo 11 |
| `features/cadastro/titulares/utils/cnpjValidator.ts` | Utility | Validação CNPJ alfanumérico RFB |
| `features/cadastro/titulares/utils/documentFormatter.ts` | Utility | Formatação CPF/CNPJ |
| `features/cadastro/titulares/index.ts` | Export | Public API da feature |

### Arquivos a Modificar

| Caminho | Alteração |
|---------|-----------|
| `shared/services/apiClient.ts` | Adicionar `apiPost`, `apiPut`, `apiDelete` |
| `shared/components/layout/sidebar/Sidebar.tsx` | Adicionar "Titulares" no menu de Cadastro |
| `features/cadastro/index.tsx` | Adicionar rotas `/titulares`, `/titulares/novo`, `/titulares/:id/editar` |
| `src/App.tsx` | Wrappear com `ToastProvider` |

### Arquivos de Referência (não alterar)

| Caminho | Motivo |
|---------|--------|
| `frontend/DESIGN.md` | Fonte de verdade para tokens, cores, componentes, princípios visuais |
| `tasks/prd-gestao-titulares/api-contract.yaml` | Schema dos types TypeScript |
| `tasks/prd-gestao-titulares/api-contract.md` | Exemplos JSON para desenvolvimento |
| `docs/validacoes/cnpj.md` | Algoritmo de validação CNPJ alfanumérico |
| `features/cadastro/associacoes/` | Padrão a seguir para estrutura da feature |
| Stitch screen `28d9d5dde6be44c0b3b307bb311051c0` | Referência visual (Associações) |

---

## Análise de Impacto

| Componente | Tipo | Descrição & Risco |
|---|---|---|
| `apiClient.ts` | Extensão | Adicionar POST/PUT/DELETE — usado por todas as features futuras com escrita | Baixo |
| `Sidebar.tsx` | Extensão | Adicionar item "Titulares" — trivial | Baixo |
| Cadastro routes | Extensão | 3 novas rotas — trivial | Baixo |
| App.tsx | Extensão | Wrappear com ToastProvider — uma vez | Baixo |
| 8 novos shared components | Fundação | Button, TextInput, Select, FormField, Badge, Pagination, Modal, Toast — reutilizáveis por F03+ | Médio (volume) |

---

## Abordagem de Testes

### Fase atual — Manual

- Criar titular PF com CPF válido → sucesso, redirect para listagem com toast
- Criar titular PJ com CNPJ alfanumérico → sucesso
- Criar com CPF inválido → erro inline no campo
- Criar com CPF duplicado → erro 409 exibido como toast
- Filtrar por nome parcial → tabela atualiza com debounce
- Paginar → dados trocam, URL params atualizam
- Ordenar por coluna → seta muda, dados reordenam
- Editar titular → campos tipo/documento disabled
- Excluir titular sem vínculos → modal + confirmação + toast
- Excluir titular com vínculos → modal + erro 409 exibido

### Futuro (F03+)

Vitest + React Testing Library + MSW para componentes e hooks.

---

## Sequenciamento de Desenvolvimento

### Ordem de Construção

1. **Stitch mockups** — 4 screens no projeto mcad (ID: `533156784329699726`)
2. **apiClient extensão** — apiPost, apiPut, apiDelete
3. **useDebounce** — hook genérico
4. **Shared UI — Fundação** — Button, TextInput, Select, FormField, Badge
5. **Shared UI — Interação** — Pagination, Modal, Toast + ToastProvider
6. **Feature types** — titular.ts (derivado do API Contract)
7. **Feature API** — titularesApi.ts (5 funções)
8. **Feature hooks** — useTitulares, useTitular, useCreateTitular, useUpdateTitular, useDeleteTitular
9. **Feature utils** — cpfValidator, cnpjValidator, documentFormatter
10. **Feature components** — TitularesTable, TitularesFilters, TitularForm, DeleteTitularModal
11. **Feature pages** — TitularesPage, TitularCreatePage, TitularEditPage
12. **Integração** — Sidebar + Routes + App (ToastProvider)

---

## Mapeamento PRD → Frontend

| Requisito | Componente |
|-----------|-----------|
| RF-01 (criar titular) | TitularCreatePage + TitularForm + useCreateTitular |
| RF-02/03 (validação CPF/CNPJ) | cpfValidator.ts + cnpjValidator.ts + TextInput mask |
| RF-05 (unicidade) | Erro 409 capturado pelo hook → toast |
| RF-06 (dropdown associação) | Select + useAssociacoes (reutiliza hook de F01) |
| RF-10 (editar) | TitularEditPage + TitularForm + useUpdateTitular |
| RF-11 (tipo imutável) | TitularForm: campos tipo/documento disabled em modo edição |
| RF-13 (paginação) | Pagination + useTitulares com filtros |
| RF-14 (ordenação) | TitularesTable com headers clicáveis |
| RF-15-18 (filtros) | TitularesFilters + useDebounce |
| RF-19 (colunas da tabela) | TitularesTable: nome, tipo (badge), documento (mono), associação (sigla), status (badge) |
| RF-23 (proteger exclusão) | DeleteTitularModal + erro 409 → toast |

---

*Tech Spec Frontend gerada com a skill `flow-techspec-creator`. Para gerar as tarefas de implementação, use a skill `flow-task-creator` fornecendo este arquivo e o `techspec.md` (backend) como contexto.*
