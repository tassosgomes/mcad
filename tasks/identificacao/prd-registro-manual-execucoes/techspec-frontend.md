# Especificação Técnica Frontend — F02: Registro Manual de Execuções

> **PRD:** `tasks/prd-registro-manual-execucoes/prd.md`
> **API Contract:** `tasks/prd-registro-manual-execucoes/api-contract.yaml`
> **TechSpec Backend:** `tasks/prd-registro-manual-execucoes/techspec.md`
> **Domínio:** Identificação (D02)
> **Última revisão:** 2026-04-02

---

## Resumo Executivo

Esta feature adiciona ao módulo de Identificação (já criado em F01) uma seção de execuções dentro da tela de detalhe da captação. Inclui: tabela de execuções paginada, formulário de adição/edição com busca autocomplete no Cadastro, campos condicionais por rubrica, criação inline de obras/fonogramas pendentes, modal de exclusão e cálculo de duração em tempo real.

Nenhuma página nova é criada — tudo é integrado à `CaptacaoDetailPage` existente como seção adicional. O componente de busca no Cadastro é o elemento mais complexo: autocomplete com debounce, exibição de resultados tipados (obra/fonograma) e fallback para criação inline.

---

## Stitch — Mockup Obrigatório

| Campo | Valor |
|-------|-------|
| **Projeto** | mcad |
| **ID** | `533156784329699726` |

**Telas a desenhar antes da implementação:**

| # | Tela | Descrição |
|---|------|-----------|
| 1 | Seção Execuções na CaptacaoDetailPage | Tabela paginada dentro do detalhe, botão "Adicionar Execução", badges de status, ações por linha |
| 2 | Formulário de Execução (modal ou inline) | Busca autocomplete, campos de horário, campos condicionais (tipo utilização + título programa), cálculo de duração live |
| 3 | Componente de Busca no Cadastro | Autocomplete com resultados tipados (obra/fonograma), ISRC/ISWC ao lado do título, opção "Criar pendente" no footer |
| 4 | Modal de Criação de Obra Pendente | Campos mínimos: título, tipo de obra. Botões confirmar/cancelar |
| 5 | Modal de Criação de Fonograma Pendente | Campo: ISRC (opcional). Obra já vinculada (exibida como read-only). Botões confirmar/cancelar |
| 6 | Dialog de Exclusão de Execução | Confirmação com título da obra em bold |

**Dados de exemplo para mockups:**
```json
{
  "execucao": {
    "obraTitulo": "Meu Bem Querer",
    "fonogramaIsrc": "BRUM71500001",
    "interpretes": "Djavan / Caetano Veloso / Gilberto Gil",
    "inicio": "14:30:00",
    "fim": "14:33:45",
    "duracaoSegundos": 225,
    "quantidade": 1,
    "tipoUtilizacao": { "sigla": "TA", "descricao": "Tema de Abertura" },
    "tituloPrograma": "Novela das 9 - Cap. 142",
    "status": "IDENTIFICADA"
  },
  "buscaResultados": [
    { "tipo": "fonograma", "titulo": "Meu Bem Querer", "isrc": "BRUM71500001", "interpretes": "Djavan", "status": "LIBERADO" },
    { "tipo": "obra", "titulo": "Meu Bem Querer", "iswc": "T-345.246.800-1", "status": "LIBERADO" },
    { "tipo": "fonograma", "titulo": "Meu Bem Querer (Ao Vivo)", "isrc": "BRUM71500042", "interpretes": "Djavan", "status": "PENDENTE" }
  ]
}
```

---

## Arquitetura do Módulo

### Estrutura de Pastas (incremental sobre F01)

```
frontend/src/features/identificacao/
├── index.tsx                                          # (já existe — F01)
└── captacoes/
    ├── index.ts                                       # (já existe — F01)
    ├── types/
    │   ├── captacao.ts                                # (já existe — F01)
    │   └── execucao.ts                                # NOVO
    ├── api/
    │   ├── captacoesApi.ts                            # (já existe — F01)
    │   ├── execucoesApi.ts                            # NOVO
    │   └── buscaCadastroApi.ts                        # NOVO (chama Cadastro :5001)
    ├── hooks/
    │   ├── ... (hooks F01 existentes)
    │   ├── useExecucoes.ts                            # NOVO
    │   ├── useCreateExecucao.ts                       # NOVO
    │   ├── useUpdateExecucao.ts                       # NOVO
    │   ├── useDeleteExecucao.ts                       # NOVO
    │   ├── useTiposUtilizacao.ts                      # NOVO
    │   ├── useBuscaCadastro.ts                        # NOVO
    │   ├── useCreateObraPendente.ts                   # NOVO
    │   └── useCreateFonogramaPendente.ts              # NOVO
    ├── pages/
    │   ├── CaptacaoDetailPage.tsx                     # MODIFICAR — adicionar seção Execuções
    │   └── ... (outras pages F01)
    └── components/
        ├── ... (componentes F01 existentes)
        ├── ExecucoesSection.tsx                       # NOVO — wrapper da seção
        ├── ExecucoesSection.module.css
        ├── ExecucoesTable.tsx                         # NOVO
        ├── ExecucoesTable.module.css
        ├── ExecucaoFormModal.tsx                      # NOVO — modal de criação/edição
        ├── ExecucaoFormModal.module.css
        ├── BuscaCadastroAutocomplete.tsx              # NOVO — autocomplete
        ├── BuscaCadastroAutocomplete.module.css
        ├── CriarObraPendenteModal.tsx                 # NOVO
        ├── CriarObraPendenteModal.module.css
        ├── CriarFonogramaPendenteModal.tsx            # NOVO
        ├── CriarFonogramaPendenteModal.module.css
        ├── DeleteExecucaoModal.tsx                    # NOVO
        └── DeleteExecucaoModal.module.css
```

---

## Tipos TypeScript

```typescript
// types/execucao.ts

export type StatusExecucao = 'IDENTIFICADA' | 'PENDENTE';

export interface TipoUtilizacao {
  id: string;
  sigla: string;
  descricao: string;
  peso: number;
}

export interface Execucao {
  id: string;
  obraId: string;
  fonogramaId: string | null;
  obraTitulo: string;
  fonogramaIsrc: string | null;
  obraIswc: string | null;
  interpretes: string;
  inicio: string;              // "HH:mm:ss"
  fim: string;                 // "HH:mm:ss"
  duracaoSegundos: number;
  quantidade: number;
  tipoUtilizacao: TipoUtilizacao | null;
  tituloPrograma: string | null;
  status: StatusExecucao;
  criadoEm: string;
  atualizadoEm: string;
}

export interface CriarExecucaoRequest {
  obraId: string;
  fonogramaId?: string | null;
  inicio: string;
  fim: string;
  quantidade: number;
  tipoUtilizacaoId?: string | null;
  tituloPrograma?: string | null;
}

export interface AtualizarExecucaoRequest {
  obraId: string;
  fonogramaId?: string | null;
  inicio: string;
  fim: string;
  quantidade: number;
  tipoUtilizacaoId?: string | null;
  tituloPrograma?: string | null;
}

export interface ExecucaoListResponse {
  data: Execucao[];
  pagination: {
    page: number;
    size: number;
    total: number;
    totalPages: number;
  };
}

export interface TipoUtilizacaoListResponse {
  data: TipoUtilizacao[];
}

export interface ExecucaoFiltros {
  page: number;
  size: number;
  sort?: string;
  status?: StatusExecucao;
}

// ── Busca no Cadastro ──

export type ResultadoTipo = 'obra' | 'fonograma';

export interface ResultadoBusca {
  tipo: ResultadoTipo;
  id: string;
  obraId: string | null;
  titulo: string;
  isrc: string | null;
  iswc: string | null;
  interpretes: string | null;
  status: string;
}

export interface BuscaCadastroResponse {
  resultados: ResultadoBusca[];
}

// ── Item selecionado da busca (estado interno) ──

export interface ObraFonogramaSelecionado {
  obraId: string;
  fonogramaId: string | null;
  titulo: string;
  isrc: string | null;
  iswc: string | null;
  interpretes: string;
  isPendente: boolean;
}
```

---

## Camada de API

### execucoesApi.ts (Identificação :5100)

```typescript
import { apiGet, apiPost, apiPut, apiDelete } from '@shared/services/apiIdentificacaoClient';

const base = (captacaoId: string) => `/captacoes/${captacaoId}/execucoes`;

export function getExecucoes(captacaoId: string, filtros: ExecucaoFiltros) {
  const params = new URLSearchParams();
  params.set('page', String(filtros.page));
  params.set('size', String(filtros.size));
  if (filtros.sort) params.set('sort', filtros.sort);
  if (filtros.status) params.set('status', filtros.status);
  return apiGet<ExecucaoListResponse>(`${base(captacaoId)}?${params}`);
}

export function criarExecucao(captacaoId: string, data: CriarExecucaoRequest) {
  return apiPost<Execucao>(`${base(captacaoId)}`, data);
}

export function atualizarExecucao(captacaoId: string, id: string, data: AtualizarExecucaoRequest) {
  return apiPut<Execucao>(`${base(captacaoId)}/${id}`, data);
}

export function excluirExecucao(captacaoId: string, id: string) {
  return apiDelete(`${base(captacaoId)}/${id}`);
}

export function getTiposUtilizacao() {
  return apiGet<TipoUtilizacaoListResponse>('/tipos-utilizacao');
}
```

### buscaCadastroApi.ts (Cadastro :5001)

```typescript
import { apiGet } from '@shared/services/apiClient';  // apiClient aponta para Cadastro

export function buscarCadastro(q: string, tipo?: string, size?: number) {
  const params = new URLSearchParams();
  params.set('q', q);
  if (tipo) params.set('tipo', tipo);
  if (size) params.set('size', String(size));
  return apiGet<BuscaCadastroResponse>(`/busca?${params}`);
}

// Criação de pendentes — usa endpoints existentes do Cadastro
export function criarObraPendente(data: { titulo: string; tipo: string }) {
  return apiPost<{ id: string }>('/obras', data);
}

export function criarFonogramaPendente(data: { obraId: string; isrc?: string }) {
  return apiPost<{ id: string }>('/fonogramas', data);
}
```

**Nota:** `buscaCadastroApi` usa o `apiClient` original (`:5001`), não o `apiIdentificacaoClient` (`:5100`). Dois clientes HTTP diferentes.

---

## Hooks React Query

### useTiposUtilizacao — Cache longo

```typescript
export function useTiposUtilizacao() {
  return useQuery({
    queryKey: ['tiposUtilizacao'],
    queryFn: getTiposUtilizacao,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60,
    select: (data) => data.data,
  });
}
```

### useExecucoes — Lista paginada

```typescript
export function useExecucoes(captacaoId: string, filtros: ExecucaoFiltros) {
  return useQuery({
    queryKey: ['execucoes', captacaoId, filtros],
    queryFn: () => getExecucoes(captacaoId, filtros),
    placeholderData: keepPreviousData,
    enabled: !!captacaoId,
  });
}
```

### useCreateExecucao — Mutation

```typescript
export function useCreateExecucao(captacaoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CriarExecucaoRequest) => criarExecucao(captacaoId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['execucoes', captacaoId] });
      queryClient.invalidateQueries({ queryKey: ['captacoes', captacaoId] }); // atualiza resumo
    },
  });
}
```

### useUpdateExecucao — Mutation

```typescript
export function useUpdateExecucao(captacaoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AtualizarExecucaoRequest }) =>
      atualizarExecucao(captacaoId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['execucoes', captacaoId] });
      queryClient.invalidateQueries({ queryKey: ['captacoes', captacaoId] });
    },
  });
}
```

### useDeleteExecucao — Mutation

```typescript
export function useDeleteExecucao(captacaoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => excluirExecucao(captacaoId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['execucoes', captacaoId] });
      queryClient.invalidateQueries({ queryKey: ['captacoes', captacaoId] });
    },
  });
}
```

### useBuscaCadastro — Autocomplete com debounce

```typescript
export function useBuscaCadastro(termo: string, tipo?: string) {
  const debouncedTermo = useDebounce(termo, 300);

  return useQuery({
    queryKey: ['buscaCadastro', debouncedTermo, tipo],
    queryFn: () => buscarCadastro(debouncedTermo, tipo, 20),
    enabled: debouncedTermo.length >= 3,
    staleTime: 1000 * 30,    // 30s — resultados podem mudar se alguém cadastrar algo
    select: (data) => data.resultados,
  });
}
```

### useCreateObraPendente / useCreateFonogramaPendente

```typescript
export function useCreateObraPendente() {
  return useMutation({
    mutationFn: criarObraPendente,
  });
}

export function useCreateFonogramaPendente() {
  return useMutation({
    mutationFn: criarFonogramaPendente,
  });
}
```

**Nota:** Estes hooks invalidam queries de busca implicitamente (o próximo autocomplete vai buscar o novo registro).

---

## Design de Componentes

### ExecucoesSection.tsx — Wrapper da seção

**Responsabilidades:**
- Container da seção "Execuções" dentro da CaptacaoDetailPage
- Gerencia estado de filtros da tabela
- Gerencia estados de modais (criação, edição, exclusão)
- Orquestra hooks de execuções e mutations

**Props:**
```typescript
interface ExecucoesSectionProps {
  captacaoId: string;
  rubrica: Rubrica;              // Para campos condicionais
  captacaoStatus: StatusCaptacao;
  isOwner: boolean;              // canWrite && é dono
}
```

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ Execuções                     [Adicionar Execução]│
├─────────────────────────────────────────────────┤
│ [ExecucoesTable]                                 │
│  Título | ISRC | Intérpretes | Início | Fim | ...│
│  ...                                             │
├─────────────────────────────────────────────────┤
│ [Pagination]                                     │
└─────────────────────────────────────────────────┘
```

Botão "Adicionar Execução" visível somente se `isOwner && captacaoStatus === 'ABERTA'`.

---

### ExecucoesTable.tsx — Tabela de execuções

**Props:**
```typescript
interface ExecucoesTableProps {
  data: Execucao[];
  isOwner: boolean;
  captacaoAberta: boolean;
  sort: string;
  onSortChange: (sort: string) => void;
  onEdit: (execucao: Execucao) => void;
  onDelete: (execucao: Execucao) => void;
}
```

**Colunas:**

| Coluna | Campo | Sortável | Formatação |
|--------|-------|----------|------------|
| Título | `obraTitulo` | Sim (`titulo`) | Texto + ISRC/ISWC em fonte mono abaixo |
| Intérpretes | `interpretes` | Não | Texto truncado (max 40 chars) |
| Início | `inicio` | Sim (`inicio`) | `HH:mm:ss` |
| Fim | `fim` | Não | `HH:mm:ss` |
| Duração | `duracaoSegundos` | Não | Formatado: `3min 45s` |
| Qtd | `quantidade` | Não | Número |
| Tipo | `tipoUtilizacao.sigla` | Não | Badge (se presente) |
| Status | `status` | Não | Badge: IDENTIFICADA=`success`, PENDENTE=`warning` |
| Ações | — | — | Edit + Delete (condicional) |

Ações visíveis somente se `isOwner && captacaoAberta`.

**Formatação de duração:**
```typescript
function formatDuracao(segundos: number): string {
  const min = Math.floor(segundos / 60);
  const sec = segundos % 60;
  if (min === 0) return `${sec}s`;
  if (sec === 0) return `${min}min`;
  return `${min}min ${sec}s`;
}
```

---

### ExecucaoFormModal.tsx — Formulário de criação/edição

**Props:**
```typescript
interface ExecucaoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  captacaoId: string;
  rubrica: Rubrica;
  initialData?: Execucao;           // undefined = criação, definido = edição
  onSuccess: () => void;
}
```

**Campos do formulário:**

| Campo | Componente | Condicional | Observação |
|-------|------------|-------------|------------|
| Obra/Fonograma | `BuscaCadastroAutocomplete` | Não | Componente customizado |
| Início | `<input type="time" step="1">` | Não | HTML5 nativo com segundos |
| Fim | `<input type="time" step="1">` | Não | HTML5 nativo |
| Duração | Texto read-only | Não | Calculado live: `formatDuracao(fim - inicio)` |
| Quantidade | `<TextInput type="number" min={1}>` | Não | Default: 1 |
| Tipo de utilização | `<Select>` de `useTiposUtilizacao()` | `rubrica.exigeClassificacao` | Oculto se não-audiovisual |
| Título do programa | `<TextInput>` max 255 | `rubrica.exigeClassificacao` | Oculto se não-audiovisual |

**Estado interno:**
```typescript
const [selecionado, setSelecionado] = useState<ObraFonogramaSelecionado | null>(
  initialData ? mapExecucaoToSelecionado(initialData) : null
);
const [inicio, setInicio] = useState(initialData?.inicio ?? '');
const [fim, setFim] = useState(initialData?.fim ?? '');
const [quantidade, setQuantidade] = useState(initialData?.quantidade ?? 1);
const [tipoUtilizacaoId, setTipoUtilizacaoId] = useState(
  initialData?.tipoUtilizacao?.id ?? ''
);
const [tituloPrograma, setTituloPrograma] = useState(
  initialData?.tituloPrograma ?? ''
);
```

**Cálculo de duração live:**
```typescript
const duracaoSegundos = useMemo(() => {
  if (!inicio || !fim) return 0;
  const [h1, m1, s1] = inicio.split(':').map(Number);
  const [h2, m2, s2] = fim.split(':').map(Number);
  const totalInicio = h1 * 3600 + m1 * 60 + (s1 || 0);
  const totalFim = h2 * 3600 + m2 * 60 + (s2 || 0);
  return totalFim > totalInicio ? totalFim - totalInicio : 0;
}, [inicio, fim]);
```

**Validação client-side:**

| Regra | Mensagem |
|-------|----------|
| `!selecionado` | "Selecione uma obra ou fonograma" |
| `!inicio` | "Informe o horário de início" |
| `!fim` | "Informe o horário de fim" |
| `fim <= inicio` | "O horário de fim deve ser posterior ao início" |
| `quantidade < 1` | "Quantidade deve ser ao menos 1" |
| `rubrica.exigeClassificacao && !tipoUtilizacaoId` | "Tipo de utilização é obrigatório para esta rubrica" |
| `rubrica.exigeClassificacao && !tituloPrograma.trim()` | "Título do programa é obrigatório para esta rubrica" |

**Tratamento de erros do backend:**

| code | Ação no UI |
|------|------------|
| `STATUS_INVALIDO` | Toast: "Captação não está mais aberta" + fechar modal |
| `TIPO_UTILIZACAO_OBRIGATORIO` | Toast com detail |
| `TITULO_PROGRAMA_OBRIGATORIO` | Toast com detail |
| `HORARIO_INVALIDO` | Toast com detail |
| `FORBIDDEN` | Toast: "Apenas o analista responsável pode adicionar execuções" |

---

### BuscaCadastroAutocomplete.tsx — Componente de busca

**Props:**
```typescript
interface BuscaCadastroAutocompleteProps {
  value: ObraFonogramaSelecionado | null;
  onChange: (item: ObraFonogramaSelecionado | null) => void;
  disabled?: boolean;
}
```

**Comportamento:**
1. Input de texto com ícone de busca
2. Debounce 300ms, min 3 chars antes de buscar
3. Dropdown com resultados tipados:
   - Fonograma: `🎵 Título — ISRC: BRUM... — Djavan` + badge status
   - Obra: `📝 Título — ISWC: T-345...` + badge status
4. Footer do dropdown (sempre visível quando busca retorna): "Não encontrou? **Criar obra pendente** | **Criar fonograma pendente**"
5. Ao selecionar: fecha dropdown, preenche `onChange` com dados do item
6. Ao clicar "Criar obra pendente": abre `CriarObraPendenteModal`
7. Ao clicar "Criar fonograma pendente": abre `CriarFonogramaPendenteModal` (só se já tem obra selecionada)

**Estado interno:**
```typescript
const [termo, setTermo] = useState('');
const [isDropdownOpen, setIsDropdownOpen] = useState(false);
const [showCriarObra, setShowCriarObra] = useState(false);
const [showCriarFono, setShowCriarFono] = useState(false);

const { data: resultados, isLoading } = useBuscaCadastro(termo);
```

**Exibição do valor selecionado:**
Quando `value` não é null, o input mostra: `{titulo} — {isrc || iswc}` com botão X para limpar.

---

### CriarObraPendenteModal.tsx

**Props:**
```typescript
interface CriarObraPendenteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (obra: ObraFonogramaSelecionado) => void;
}
```

**Campos:**
- Título (obrigatório, TextInput)
- Tipo de obra (Select: MUSICAL, LITEROMUSICAL, VERSAO, POT_POURRI)

**Fluxo:**
1. Preenche campos mínimos
2. Clica "Criar"
3. `useCreateObraPendente` chama `POST /obras` no Cadastro
4. Sucesso: chama `onCreated` com dados → autocomplete preenchido, execução será PENDENTE
5. Erro: toast com detail

---

### CriarFonogramaPendenteModal.tsx

**Props:**
```typescript
interface CriarFonogramaPendenteModalProps {
  isOpen: boolean;
  onClose: () => void;
  obraId: string;                    // Obra já selecionada (obrigatório)
  obraTitulo: string;
  onCreated: (fono: ObraFonogramaSelecionado) => void;
}
```

**Campos:**
- Obra vinculada (read-only, exibe `obraTitulo`)
- ISRC (opcional, TextInput)

**Fluxo:**
1. Preenche ISRC (opcional)
2. Clica "Criar"
3. `useCreateFonogramaPendente` chama `POST /fonogramas` no Cadastro com `obraId`
4. Sucesso: chama `onCreated` → autocomplete preenchido
5. Erro: toast com detail

---

### DeleteExecucaoModal.tsx

**Props:**
```typescript
interface DeleteExecucaoModalProps {
  execucao: Execucao | null;
  isOpen: boolean;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}
```

**Conteúdo:** "Excluir execução de **{obraTitulo}** ({inicio} — {fim})?"

---

## Integração com CaptacaoDetailPage

A `CaptacaoDetailPage` (F01) é modificada para incluir a seção de execuções:

```tsx
// CaptacaoDetailPage.tsx — adicionar após formulário de captação:

<ExecucoesSection
  captacaoId={captacao.id}
  rubrica={captacao.rubrica}
  captacaoStatus={captacao.status}
  isOwner={canWrite && captacao.analistaResponsavel.id === userId}
/>
```

**Layout atualizado da CaptacaoDetailPage:**
```
┌──────────────────────────────────────────┐
│ ← Captações                               │
│ TV Aberta — 15/01/2026  [ABERTA] [Excluir]│
├──────────────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐              │
│ │ 150  │ │ 142  │ │  8   │              │
│ │Total │ │Ident.│ │Pend. │              │
│ └──────┘ └──────┘ └──────┘              │
├──────────────────────────────────────────┤
│ [CaptacaoForm — dados da captação]       │
├──────────────────────────────────────────┤
│ [ExecucoesSection — NOVO]                │
│   Execuções              [Adicionar +]   │
│   ┌──────────────────────────────────┐   │
│   │ ExecucoesTable (paginada)        │   │
│   └──────────────────────────────────┘   │
│   [Pagination]                           │
└──────────────────────────────────────────┘
```

Os contadores de resumo (Total/Identificadas/Pendentes) já existem em F01 — agora são alimentados com dados reais pelo backend.

---

## Pontos de Integração

### Dois API Clients

| API | Client | Usado para |
|-----|--------|------------|
| Identificação `:5100` | `apiIdentificacaoClient` | CRUD de execuções, tipos de utilização |
| Cadastro `:5001` | `apiClient` (original) | Busca unificada, criação de pendentes |

**Nota:** O `apiClient` original (F01 do Cadastro) já aponta para `:5001`. O `apiIdentificacaoClient` (F01 da Identificação) aponta para `:5100`. Ambos já existem.

### Invalidação de cache cruzada

Mutations de execuções invalidam:
- `['execucoes', captacaoId]` — tabela de execuções
- `['captacoes', captacaoId]` — detalhe da captação (atualiza contadores do resumo)

---

## Análise de Impacto

| Componente | Tipo | Descrição | Risco |
|---|---|---|---|
| `CaptacaoDetailPage.tsx` | Adição de seção | Adicionar `ExecucoesSection` abaixo do form | Baixo |
| Contadores de resumo | Alimentados com dados reais | Antes mostravam 0/0/0, agora mostram dados | Baixo |
| Bundle size | Novos componentes + hooks | Lazy-loaded no chunk de Identificação | Baixo |
| `apiClient.ts` | Sem alteração | Já aponta para Cadastro :5001 | Nenhum |

---

## Sequenciamento de Desenvolvimento

| # | Etapa | Dependência |
|---|-------|-------------|
| 1 | **Stitch mockups** — 6 telas | Nenhuma |
| 2 | **types/execucao.ts** — interfaces | api-contract.yaml |
| 3 | **api/** — execucoesApi + buscaCadastroApi | Etapa 2 |
| 4 | **hooks/** — 8 hooks | Etapa 3 |
| 5 | **BuscaCadastroAutocomplete** — componente mais complexo | Etapa 4 + mockups |
| 6 | **CriarObraPendenteModal + CriarFonogramaPendenteModal** | Etapa 4 + 5 |
| 7 | **ExecucaoFormModal** — usa autocomplete + modais de pendente | Etapa 5 + 6 |
| 8 | **ExecucoesTable + DeleteExecucaoModal** | Etapa 4 + mockups |
| 9 | **ExecucoesSection** — orquestrador | Etapa 7 + 8 |
| 10 | **CaptacaoDetailPage** — integrar seção | Etapa 9 |

---

## Inventário de Artefatos

### Arquivos a Criar

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| `frontend/src/features/identificacao/captacoes/types/execucao.ts` | Types | Interfaces de execução, busca, tipos de utilização |
| `frontend/src/features/identificacao/captacoes/api/execucoesApi.ts` | API | CRUD execuções + tipos de utilização |
| `frontend/src/features/identificacao/captacoes/api/buscaCadastroApi.ts` | API | Busca + criação de pendentes (Cadastro :5001) |
| `frontend/src/features/identificacao/captacoes/hooks/useExecucoes.ts` | Hook | Lista com filtros |
| `frontend/src/features/identificacao/captacoes/hooks/useCreateExecucao.ts` | Hook | Mutation criar |
| `frontend/src/features/identificacao/captacoes/hooks/useUpdateExecucao.ts` | Hook | Mutation atualizar |
| `frontend/src/features/identificacao/captacoes/hooks/useDeleteExecucao.ts` | Hook | Mutation excluir |
| `frontend/src/features/identificacao/captacoes/hooks/useTiposUtilizacao.ts` | Hook | Seed cache longo |
| `frontend/src/features/identificacao/captacoes/hooks/useBuscaCadastro.ts` | Hook | Autocomplete com debounce |
| `frontend/src/features/identificacao/captacoes/hooks/useCreateObraPendente.ts` | Hook | Mutation criar obra |
| `frontend/src/features/identificacao/captacoes/hooks/useCreateFonogramaPendente.ts` | Hook | Mutation criar fonograma |
| `frontend/src/features/identificacao/captacoes/components/ExecucoesSection.tsx` | Component | Wrapper/orquestrador |
| `frontend/src/features/identificacao/captacoes/components/ExecucoesSection.module.css` | Style | CSS Module |
| `frontend/src/features/identificacao/captacoes/components/ExecucoesTable.tsx` | Component | Tabela de execuções |
| `frontend/src/features/identificacao/captacoes/components/ExecucoesTable.module.css` | Style | CSS Module |
| `frontend/src/features/identificacao/captacoes/components/ExecucaoFormModal.tsx` | Component | Modal formulário |
| `frontend/src/features/identificacao/captacoes/components/ExecucaoFormModal.module.css` | Style | CSS Module |
| `frontend/src/features/identificacao/captacoes/components/BuscaCadastroAutocomplete.tsx` | Component | Autocomplete |
| `frontend/src/features/identificacao/captacoes/components/BuscaCadastroAutocomplete.module.css` | Style | CSS Module |
| `frontend/src/features/identificacao/captacoes/components/CriarObraPendenteModal.tsx` | Component | Modal criar obra |
| `frontend/src/features/identificacao/captacoes/components/CriarObraPendenteModal.module.css` | Style | CSS Module |
| `frontend/src/features/identificacao/captacoes/components/CriarFonogramaPendenteModal.tsx` | Component | Modal criar fonograma |
| `frontend/src/features/identificacao/captacoes/components/CriarFonogramaPendenteModal.module.css` | Style | CSS Module |
| `frontend/src/features/identificacao/captacoes/components/DeleteExecucaoModal.tsx` | Component | Dialog exclusão |
| `frontend/src/features/identificacao/captacoes/components/DeleteExecucaoModal.module.css` | Style | CSS Module |

### Arquivos a Modificar

| Caminho | Alteração |
|---------|-----------|
| `frontend/src/features/identificacao/captacoes/pages/CaptacaoDetailPage.tsx` | Adicionar `<ExecucoesSection>` abaixo do formulário |

### Arquivos de Referência (não alterar)

| Caminho | Motivo |
|---------|--------|
| `frontend/src/features/identificacao/captacoes/types/captacao.ts` | Tipos Rubrica, StatusCaptacao |
| `frontend/src/shared/services/apiClient.ts` | API client Cadastro :5001 |
| `frontend/src/shared/services/apiIdentificacaoClient.ts` | API client Identificação :5100 |
| `frontend/src/shared/hooks/useDebounce.ts` | Debounce para autocomplete |
| `frontend/src/shared/components/ui/modal/Modal.tsx` | Base para modais |
| `frontend/src/shared/components/ui/badge/Badge.tsx` | Badges de status |
| `frontend/src/shared/components/ui/pagination/Pagination.tsx` | Paginação |
| `frontend/src/features/cadastro/titulares/components/TitularesTable.tsx` | Referência de busca/autocomplete existente no Cadastro |

---

*TechSpec Frontend gerada com a skill `flow-techspec-creator`. Para gerar as tarefas de implementação, use a skill `flow-task-creator`.*
