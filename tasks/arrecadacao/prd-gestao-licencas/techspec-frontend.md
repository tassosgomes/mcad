# Tech Spec — F03: Gestão de Licenças (Frontend)

> **PRD:** `tasks/arrecadacao/prd-gestao-licencas/prd.md`
> **API Contract:** `tasks/arrecadacao/prd-gestao-licencas/api-contract.yaml`
> **Backend Tech Spec:** `tasks/arrecadacao/prd-gestao-licencas/techspec.md`
> **Data:** 2026-04-05

---

## Resumo Executivo

Primeira feature frontend do domínio Arrecadação. Implementa a interface de gestão de licenças com listagem paginada (5 filtros incluindo vigente), criação (seleção de Usuário de Música e Rubrica), detalhes com histórico de transições, e modais de transição de status (Suspender, Reativar, Encerrar) com justificativa obrigatória.

Estabelece a fundação frontend do domínio Arrecadação: API client dedicado (porta 5003), módulo de feature em `src/features/arrecadacao/`, ativação da seção Arrecadação no sidebar e rotas protegidas por role.

Segue os padrões do Cadastro (Titulares): TanStack Query, CSS Modules, formulários com estado manual, toast para feedback, componentes de UI compartilhados (Table, Pagination, Modal, Button, TextInput, Select).

---

## Skills de Referência

| Skill | Decisões Influenciadas |
|-------|------------------------|
| `react-architecture` | Feature modules, hooks pattern, page/component split |
| `react-code-quality` | TypeScript strict, types co-located, naming |
| `react-testing` | Vitest + Testing Library (se aplicável) |

---

## Arquitetura do Sistema

### Visão Geral dos Componentes

```
src/features/arrecadacao/
├── licencas/
│   ├── types/
│   │   └── licenca.ts              ← TypeScript types (API contract → TS)
│   ├── api/
│   │   └── licencasApi.ts          ← HTTP calls via apiArrecadacaoClient
│   ├── hooks/
│   │   ├── useLicencas.ts          ← useQuery (listagem paginada)
│   │   ├── useLicenca.ts           ← useQuery (detalhe por ID)
│   │   ├── useHistoricoStatusLicenca.ts ← useQuery (histórico)
│   │   ├── useCreateLicenca.ts     ← useMutation
│   │   ├── useSuspenderLicenca.ts  ← useMutation
│   │   ├── useReativarLicenca.ts   ← useMutation
│   │   └── useEncerrarLicenca.ts   ← useMutation
│   ├── components/
│   │   ├── LicencasTable.tsx       ← Tabela com colunas expandidas
│   │   ├── LicencasFilters.tsx     ← 5 filtros (debounced)
│   │   ├── LicencaForm.tsx         ← Formulário de criação
│   │   ├── StatusBadgeLicenca.tsx  ← Badge ATIVA/SUSPENSA/ENCERRADA
│   │   ├── AlterarStatusModal.tsx  ← Modal genérico de transição
│   │   ├── HistoricoStatusTimeline.tsx ← Timeline do histórico
│   │   └── styles/                 ← CSS Modules
│   └── pages/
│       ├── LicencasPage.tsx        ← Listagem principal
│       ├── LicencaCreatePage.tsx   ← Formulário de criação
│       └── LicencaDetailPage.tsx   ← Detalhes + histórico + ações

src/shared/services/
└── apiArrecadacaoClient.ts         ← Novo client HTTP (porta 5003)
```

### Fluxo de Dados

```
Pages → Hooks (TanStack Query) → API Functions → apiArrecadacaoClient → Backend (5003)
                                                                              ↓
Pages ← Hooks (cache + revalidation) ← API Functions ← JSON Response ←──────┘
```

---

## Design de Implementação

### API Client: apiArrecadacaoClient

Novo client HTTP seguindo o padrão de `apiIdentificacaoClient.ts`:

```typescript
// src/shared/services/apiArrecadacaoClient.ts
const BASE_URL = import.meta.env.VITE_ARRECADACAO_API_BASE_URL || 'http://localhost:5003/api/v1';

// Exports: apiGetArr<T>(), apiPostArr<T>(), apiPutArr<T>(), apiDeleteArr()
// Mesma implementação de fetchWithAuth do apiClient.ts
// Token provider reutilizado do AuthProvider
```

**Nova env var:** `VITE_ARRECADACAO_API_BASE_URL=http://localhost:5003/api/v1`

### Types (API Contract → TypeScript)

```typescript
// src/features/arrecadacao/licencas/types/licenca.ts

export type StatusLicenca = 'ATIVA' | 'SUSPENSA' | 'ENCERRADA';

export interface UsuarioMusicaResumo {
  id: string;
  razaoSocial: string;
  cnpjFormatado: string;
}

export interface RubricaResumo {
  id: string;
  sigla: string;
  nome: string;
}

export interface Licenca {
  id: string;
  usuarioMusica: UsuarioMusicaResumo;
  rubrica: RubricaResumo;
  dataInicio: string;       // ISO date "2026-04-01"
  dataFim: string | null;   // null = indefinida
  status: StatusLicenca;
  criadoEm: string;         // ISO datetime
  atualizadoEm: string;
}

export interface LicencaListResponse {
  data: Licenca[];
  pagination: {
    page: number;
    size: number;
    total: number;
    totalPages: number;
  };
}

export interface CriarLicencaRequest {
  usuarioMusicaId: string;
  rubricaId: string;
  dataInicio: string;
  dataFim?: string | null;
}

export interface TransicaoStatusRequest {
  justificativa: string;
}

export interface HistoricoStatusLicenca {
  id: string;
  statusAnterior: StatusLicenca | null;
  statusNovo: StatusLicenca;
  justificativa: string;
  autor: string;
  data: string;
}

export interface LicencaFiltros {
  page: number;
  size: number;
  sort: string;
  usuarioMusicaId?: string;
  razaoSocial?: string;
  rubricaSigla?: string;
  status?: StatusLicenca | '';
  vigente?: boolean;
}
```

### API Functions

```typescript
// src/features/arrecadacao/licencas/api/licencasApi.ts

export async function getLicencas(filtros: LicencaFiltros): Promise<LicencaListResponse>
export async function getLicencaById(id: string): Promise<Licenca>
export async function criarLicenca(data: CriarLicencaRequest): Promise<Licenca>
export async function suspenderLicenca(id: string, data: TransicaoStatusRequest): Promise<Licenca>
export async function reativarLicenca(id: string, data: TransicaoStatusRequest): Promise<Licenca>
export async function encerrarLicenca(id: string, data: TransicaoStatusRequest): Promise<Licenca>
export async function getHistoricoStatusLicenca(id: string): Promise<HistoricoStatusLicenca[]>
```

Usa `apiGetArr`, `apiPostArr` do `apiArrecadacaoClient`. Query string montada para filtros com parâmetros opcionais.

### Hooks (TanStack Query)

**Query hooks:**
```typescript
// useLicencas.ts
export function useLicencas(filtros: LicencaFiltros) {
  return useQuery({
    queryKey: ['licencas', filtros],
    queryFn: () => getLicencas(filtros),
  });
}

// useLicenca.ts
export function useLicenca(id: string) {
  return useQuery({
    queryKey: ['licencas', id],
    queryFn: () => getLicencaById(id),
    enabled: !!id,
  });
}

// useHistoricoStatusLicenca.ts
export function useHistoricoStatusLicenca(id: string) {
  return useQuery({
    queryKey: ['licencas', id, 'historico-status'],
    queryFn: () => getHistoricoStatusLicenca(id),
    enabled: !!id,
  });
}
```

**Mutation hooks:**
```typescript
// useCreateLicenca.ts
export function useCreateLicenca() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: criarLicenca,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['licencas'] });
    },
  });
}

// useSuspenderLicenca.ts, useReativarLicenca.ts, useEncerrarLicenca.ts
// Same pattern: invalidate ['licencas'] and ['licencas', id] on success
```

### Components

#### StatusBadgeLicenca

```typescript
// Cores: ATIVA → verde (--color-status-success), SUSPENSA → amarelo (--color-status-warning), ENCERRADA → cinza (--color-text-muted)
// Reutiliza padrão de Badge do shared/components/ui/badge
```

#### LicencasFilters

5 filtros com debounce de 300ms:
- **Razão Social:** TextInput com debounce
- **Rubrica:** Select dropdown com 7 opções (RADIO, TV_ABERTA, etc.) — precisa de hook `useRubricas()` ou lista estática
- **Status:** Select (Todos / ATIVA / SUSPENSA / ENCERRADA)
- **Vigente:** Select (Todos / Vigentes / Expiradas)
- **Reset filters** button

#### LicencasTable

Colunas: Usuário (razaoSocial), Rubrica (sigla + nome), Data Início, Data Fim ("Indefinida" se null), Status (badge), Ações (link para detalhes).

#### LicencaForm

Formulário de criação:
1. **Usuário de Música:** Autocomplete/busca por razão social (chama GET /usuarios-musica com filtro) — apenas ATIVOS
2. **Rubrica:** Select dropdown (7 opções fixas)
3. **Data Início:** Date picker (min = hoje)
4. **Data Fim:** Date picker opcional (min = dataInicio + 1 dia)
5. Botão Salvar

Validação client-side: dataInicio >= hoje, dataFim > dataInicio (se preenchida). Erros do backend (422 Usuário INATIVO) exibidos via toast.

#### AlterarStatusModal

Modal genérico para Suspender, Reativar e Encerrar:
- Props: `acao` ('suspender' | 'reativar' | 'encerrar'), `licencaId`, `onSuccess`, `onClose`
- Textarea para justificativa (min 10 chars, validação client-side)
- Para "Encerrar": aviso visual de irreversibilidade (texto vermelho + confirmação dupla checkbox "Entendo que esta ação é irreversível")
- Botão de ação com cor contextual: Suspender (amarelo), Reativar (verde), Encerrar (vermelho/danger)

#### HistoricoStatusTimeline

Lista ordenada do mais recente ao mais antigo. Cada entry:
- Data/hora formatada
- Badge do statusNovo
- Autor
- Justificativa
- Seta statusAnterior → statusNovo

### Pages

#### LicencasPage (listagem)

```
┌─────────────────────────────────────────┐
│ PageHeader: "Licenças"  [+ Nova Licença]│ ← botão só para Analista
├─────────────────────────────────────────┤
│ LicencasFilters                         │
├─────────────────────────────────────────┤
│ LicencasTable                           │
├─────────────────────────────────────────┤
│ Pagination                              │
└─────────────────────────────────────────┘
```

#### LicencaCreatePage

```
┌─────────────────────────────────────────┐
│ PageHeader: "Nova Licença"  [← Voltar]  │
├─────────────────────────────────────────┤
│ LicencaForm                             │
└─────────────────────────────────────────┘
```

Redirect para detalhes após sucesso.

#### LicencaDetailPage

```
┌─────────────────────────────────────────┐
│ PageHeader: "Licença #abc..."  [← Voltar]│
├─────────────────────────────────────────┤
│ Card: Dados da licença                  │
│   Usuário: razaoSocial (CNPJ)          │
│   Rubrica: sigla — nome                │
│   Vigência: dataInicio → dataFim        │
│   Status: StatusBadgeLicenca            │
│   Criado em / Atualizado em             │
├─────────────────────────────────────────┤
│ Ações (só Analista, conforme status):   │
│   ATIVA: [Suspender]                    │
│   SUSPENSA: [Reativar] [Encerrar]       │
│   ENCERRADA: nenhuma ação               │
├─────────────────────────────────────────┤
│ HistoricoStatusTimeline                 │
└─────────────────────────────────────────┘
```

Botões de ação abrem `AlterarStatusModal`. Após sucesso, invalidar queries e recarregar.

### Routing

```typescript
// Em routes.tsx, dentro do layout protegido:
{
  path: 'arrecadacao',
  children: [
    {
      path: 'licencas',
      element: <RequireRole roles={['analista-arrecadacao', 'consultor-arrecadacao']}><LicencasPage /></RequireRole>
    },
    {
      path: 'licencas/nova',
      element: <RequireRole roles={['analista-arrecadacao']}><LicencaCreatePage /></RequireRole>
    },
    {
      path: 'licencas/:id',
      element: <RequireRole roles={['analista-arrecadacao', 'consultor-arrecadacao']}><LicencaDetailPage /></RequireRole>
    },
  ]
}
```

### Sidebar

Ativar a seção "Arrecadação" (atualmente `disabled: true`) e adicionar sub-item "Licenças":

```typescript
{
  label: 'Arrecadação',
  icon: Banknote,
  basePath: '/arrecadacao',
  requiredRoles: ['analista-arrecadacao', 'consultor-arrecadacao'],
  disabled: false,  // ← ativar
  children: [
    { label: 'Licenças', path: '/arrecadacao/licencas' },
  ]
}
```

---

## Inventário de Artefatos

### Arquivos a Criar

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| `src/shared/services/apiArrecadacaoClient.ts` | Service | HTTP client para arrecadação-api (porta 5003) |
| `src/features/arrecadacao/licencas/types/licenca.ts` | Types | Interfaces TypeScript do api-contract |
| `src/features/arrecadacao/licencas/api/licencasApi.ts` | API | Funções HTTP (7 endpoints) |
| `src/features/arrecadacao/licencas/hooks/useLicencas.ts` | Hook | useQuery listagem paginada |
| `src/features/arrecadacao/licencas/hooks/useLicenca.ts` | Hook | useQuery detalhe por ID |
| `src/features/arrecadacao/licencas/hooks/useHistoricoStatusLicenca.ts` | Hook | useQuery histórico |
| `src/features/arrecadacao/licencas/hooks/useCreateLicenca.ts` | Hook | useMutation criar |
| `src/features/arrecadacao/licencas/hooks/useSuspenderLicenca.ts` | Hook | useMutation suspender |
| `src/features/arrecadacao/licencas/hooks/useReativarLicenca.ts` | Hook | useMutation reativar |
| `src/features/arrecadacao/licencas/hooks/useEncerrarLicenca.ts` | Hook | useMutation encerrar |
| `src/features/arrecadacao/licencas/components/StatusBadgeLicenca.tsx` | Component | Badge ATIVA/SUSPENSA/ENCERRADA |
| `src/features/arrecadacao/licencas/components/StatusBadgeLicenca.module.css` | Style | CSS Module |
| `src/features/arrecadacao/licencas/components/LicencasTable.tsx` | Component | Tabela com colunas expandidas |
| `src/features/arrecadacao/licencas/components/LicencasFilters.tsx` | Component | 5 filtros com debounce |
| `src/features/arrecadacao/licencas/components/LicencasFilters.module.css` | Style | CSS Module |
| `src/features/arrecadacao/licencas/components/LicencaForm.tsx` | Component | Formulário criação (autocomplete Usuário + select Rubrica) |
| `src/features/arrecadacao/licencas/components/LicencaForm.module.css` | Style | CSS Module |
| `src/features/arrecadacao/licencas/components/AlterarStatusModal.tsx` | Component | Modal genérico transição |
| `src/features/arrecadacao/licencas/components/AlterarStatusModal.module.css` | Style | CSS Module |
| `src/features/arrecadacao/licencas/components/HistoricoStatusTimeline.tsx` | Component | Timeline do histórico |
| `src/features/arrecadacao/licencas/components/HistoricoStatusTimeline.module.css` | Style | CSS Module |
| `src/features/arrecadacao/licencas/pages/LicencasPage.tsx` | Page | Listagem principal |
| `src/features/arrecadacao/licencas/pages/LicencasPage.module.css` | Style | CSS Module |
| `src/features/arrecadacao/licencas/pages/LicencaCreatePage.tsx` | Page | Formulário criação |
| `src/features/arrecadacao/licencas/pages/LicencaCreatePage.module.css` | Style | CSS Module |
| `src/features/arrecadacao/licencas/pages/LicencaDetailPage.tsx` | Page | Detalhes + histórico + ações |
| `src/features/arrecadacao/licencas/pages/LicencaDetailPage.module.css` | Style | CSS Module |

### Arquivos a Modificar

| Caminho | Alteração |
|---------|-----------|
| `src/app/router/routes.tsx` | Adicionar rotas /arrecadacao/licencas/* com lazy loading |
| `src/shared/components/layout/sidebar/Sidebar.tsx` | Ativar seção Arrecadação, adicionar sub-item Licenças |
| `.env` / `.env.example` | Adicionar `VITE_ARRECADACAO_API_BASE_URL` |

### Arquivos de Referência (não alterar)

| Caminho | Motivo |
|---------|--------|
| `src/shared/services/apiIdentificacaoClient.ts` | Padrão para criar apiArrecadacaoClient |
| `src/shared/services/apiClient.ts` | Padrão fetchWithAuth e token provider |
| `src/features/cadastro/titulares/` | Padrão de feature module (types/api/hooks/components/pages) |
| `src/features/cadastro/titulares/components/TitularesFilters.tsx` | Padrão de filtros com debounce |
| `src/features/cadastro/titulares/components/TitularForm.tsx` | Padrão de formulário com validação manual |
| `src/features/cadastro/titulares/components/DeleteTitularModal.tsx` | Padrão de modal com confirmação |
| `src/shared/components/ui/badge/` | Base para StatusBadgeLicenca |
| `src/shared/components/ui/table/` | Table genérico reutilizado |
| `src/shared/components/ui/modal/` | Modal genérico reutilizado |
| `src/shared/components/ui/pagination/` | Pagination reutilizado |
| `src/shared/components/ui/autocomplete/` | Autocomplete para seleção de Usuário |
| `src/shared/hooks/useDebounce.ts` | Debounce para filtros |
| `src/shared/components/ui/toast/` | Toast para feedback |
| `tasks/arrecadacao/prd-gestao-licencas/api-contract.yaml` | Contratos de request/response |

---

## Análise de Impacto

| Componente Afetado | Tipo de Impacto | Descrição & Risco | Ação Requerida |
|--------------------|-----------------|-------------------|----------------|
| `routes.tsx` | Extensão | Novas rotas /arrecadacao/*. Baixo risco | Lazy loading para não impactar bundle |
| `Sidebar.tsx` | Extensão | Ativar seção + sub-item. Baixo risco | Apenas mudar `disabled: false` e adicionar children |
| `.env` | Nova variável | `VITE_ARRECADACAO_API_BASE_URL`. Baixo risco | Documentar no .env.example |
| F02 Frontend (futuro) | Dependência | Usuários de Música será referenciado via autocomplete na criação de licença. O apiArrecadacaoClient criado aqui será reutilizado | Criar client genérico o suficiente |

---

## Abordagem de Testes

### Testes Unitários (se aplicável)

- Validação client-side: dataInicio >= hoje, dataFim > dataInicio, justificativa >= 10 chars
- StatusBadgeLicenca: renderiza cor correta para cada status

### Testes Manuais (E2E)

- Criar licença com Usuário ATIVO e Rubrica válida → aparece na listagem
- Criar licença para Usuário INATIVO → toast de erro 422
- Suspender licença ATIVA → status muda, histórico atualizado
- Reativar licença SUSPENSA → status volta ATIVA
- Encerrar licença SUSPENSA → status ENCERRADA, sem botões de ação
- Tentar encerrar licença ATIVA → toast de erro 422
- Filtrar por status ATIVA + rubrica RADIO → resultados corretos
- Filtrar vigente=true → apenas licenças com dataFim null ou futuro
- Consultor não vê botões "Nova Licença", "Suspender", "Reativar", "Encerrar"

---

## Sequenciamento de Desenvolvimento

### Ordem de Construção

1. **apiArrecadacaoClient + env var** — fundação HTTP
2. **Types** — interfaces TypeScript do api-contract
3. **API functions** — 7 funções HTTP
4. **Query hooks** — useLicencas, useLicenca, useHistoricoStatusLicenca
5. **Mutation hooks** — useCreateLicenca, useSuspenderLicenca, useReativarLicenca, useEncerrarLicenca
6. **StatusBadgeLicenca** — componente visual reutilizável
7. **Componentes compostos** — LicencasTable, LicencasFilters, LicencaForm, AlterarStatusModal, HistoricoStatusTimeline
8. **Pages** — LicencasPage, LicencaCreatePage, LicencaDetailPage
9. **Routing + Sidebar** — integração final

### Dependências Técnicas

- Backend F03 implementado (endpoints disponíveis)
- Backend F02 implementado (GET /usuarios-musica para autocomplete na criação)
- Backend F01 implementado (GET /rubricas para select na criação)

---

## Considerações Técnicas

### Decisões Principais

| Decisão | Justificativa |
|---------|---------------|
| apiArrecadacaoClient separado (não reutilizar apiClient) | Arrecadação roda em porta diferente (5003 vs 5001); padrão do apiIdentificacaoClient |
| AlterarStatusModal genérico (não 3 modais separados) | Comportamento idêntico, apenas label/cor/confirmação variam |
| Autocomplete para seleção de Usuário (não select simples) | Pode haver centenas de usuários; busca server-side por razão social |
| Select simples para Rubrica (não autocomplete) | Apenas 7 opções fixas (seed F01) |
| CSS Modules (não styled-components) | Padrão do projeto — todos os features usam CSS Modules |
| Formulários com estado manual (não React Hook Form) | Padrão do projeto — TitularForm usa useState, não lib externa |

### Riscos Conhecidos

| Risco | Mitigação |
|-------|-----------|
| Autocomplete de Usuário com muitos resultados | Debounce 300ms + limite de resultados (size=10 na query) |
| Confusão visual entre Suspender e Encerrar | Modal de Encerrar com aviso visual forte (vermelho) + checkbox de confirmação |
| Filtro `vigente` pode confundir usuário | Tooltip explicativo: "Vigentes = data fim não definida ou futura" |

---

*Tech Spec gerada com a skill `flow-techspec-creator`. Para gerar as tarefas de implementação, use a skill `flow-task-creator`.*
