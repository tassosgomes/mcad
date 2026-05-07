# Tech Spec Frontend — F01: Seed de Associações + Fundação SPA

> **PRD:** `tasks/prd-seed-associacoes/prd.md`
> **API Contract:** `tasks/prd-seed-associacoes/api-contract.yaml`
> **Domínio:** Cadastro (D01)
> **Feature ID:** F01
> **Data:** 2026-03-29

---

## Resumo Executivo

Esta Tech Spec cobre dois escopos: (1) a **fundação do frontend SPA** do mini-ECAD — projeto React + Vite + TypeScript com design system, layout base, API client, router e estrutura intermediária com features por domínio; e (2) a **implementação da feature F01** — tela read-only de listagem das 7 associações de gestão coletiva.

Por ser o primeiro artefato frontend do projeto, as decisões tomadas aqui definem os padrões para todas as features futuras dos 4 domínios.

## Skills de Referência

| Skill | Decisões Influenciadas |
|-------|------------------------|
| `react-architecture` | Estrutura intermediária com features, path aliases, convenções de pastas/arquivos |
| `frontend-design` | Design system, direção estética, tipografia, cores, motion |

---

## Arquitetura do Sistema

### Visão Geral dos Componentes

```
frontend/                              ← SPA único para todos os domínios
├── DESIGN.md                          ← Design system documentado
├── package.json
├── vite.config.ts
├── tsconfig.json
├── .env.example
├── index.html
└── src/
    ├── main.tsx                       ← Entry point
    ├── App.tsx                        ← Providers + Router
    │
    ├── app/                           ← Configuração global da aplicação
    │   ├── providers/
    │   │   └── AppProviders.tsx        ← QueryClientProvider + ThemeProvider
    │   └── router/
    │       └── routes.tsx             ← Router com lazy loading por domínio
    │
    ├── shared/                        ← Cross-domain: UI, hooks, services, tipos
    │   ├── components/
    │   │   ├── ui/                    ← Design system components
    │   │   │   ├── table/
    │   │   │   │   ├── Table.tsx
    │   │   │   │   ├── Table.module.css
    │   │   │   │   └── index.ts
    │   │   │   ├── page-header/
    │   │   │   │   ├── PageHeader.tsx
    │   │   │   │   └── index.ts
    │   │   │   ├── loading/
    │   │   │   │   ├── Loading.tsx
    │   │   │   │   └── index.ts
    │   │   │   └── error-state/
    │   │   │       ├── ErrorState.tsx
    │   │   │       └── index.ts
    │   │   └── layout/
    │   │       ├── main-layout/
    │   │       │   ├── MainLayout.tsx
    │   │       │   ├── MainLayout.module.css
    │   │       │   └── index.ts
    │   │       ├── sidebar/
    │   │       │   ├── Sidebar.tsx
    │   │       │   ├── Sidebar.module.css
    │   │       │   └── index.ts
    │   │       └── header/
    │   │           ├── Header.tsx
    │   │           ├── Header.module.css
    │   │           └── index.ts
    │   ├── hooks/
    │   │   └── useDocumentTitle.ts
    │   ├── services/
    │   │   └── apiClient.ts           ← Fetch wrapper configurado com base URL
    │   ├── types/
    │   │   ├── api.ts                 ← ProblemDetails, tipos genéricos de API
    │   │   └── index.ts
    │   └── config/
    │       └── env.ts                 ← Variáveis de ambiente tipadas
    │
    └── features/                      ← Mapa de negócio — 1 pasta por domínio
        └── cadastro/
            ├── associacoes/           ← Feature F01
            │   ├── api/
            │   │   └── associacoesApi.ts
            │   ├── components/
            │   │   └── AssociacoesTable.tsx
            │   ├── hooks/
            │   │   └── useAssociacoes.ts
            │   ├── pages/
            │   │   └── AssociacoesPage.tsx
            │   ├── types/
            │   │   └── associacao.ts
            │   └── index.ts
            └── index.ts               ← Re-exporta pages do domínio Cadastro
```

### Decisões Arquiteturais

| Decisão | Justificativa |
|---------|---------------|
| Estrutura intermediária com `features/` por domínio | Espelha os bounded contexts do Vision Doc; escala para Fases 2-4 sem refactor |
| CSS Modules (não Tailwind) | Encapsulamento por componente; sem conflito de classes; coerente com design system próprio |
| TanStack Query (React Query) para data fetching | Cache automático, loading/error states, refetch; padrão consolidado |
| React Router v7 | Lazy loading por domínio; nested routes |
| Path aliases (`@/`, `@shared/`, `@features/`) | Imports limpos, sem `../../../` (HARD RULE PA-01 da skill) |
| DESIGN.md na raiz | Design system documentado como fonte de verdade visual |
| Fetch API nativa (não Axios) | Menos dependências; suficiente para PoC |

---

## Design System (DESIGN.md)

O `DESIGN.md` na raiz do `frontend/` documenta a identidade visual do mini-ECAD. Deve conter:

### Direção Estética

**Conceito:** Interface utilitária e institucional — inspirada em dashboards de sistemas financeiros e regulatórios. Tom sério e confiável, com acentos de cor para hierarquia visual.

**Não é:** Genérico/corporativo (sem gradientes roxos em fundo branco). Deve ter personalidade — limpa mas com caráter.

### Tokens de Design (CSS Variables)

> **Fonte de verdade:** `frontend/DESIGN.md`
> **Design System Stitch:** Circuit Core Dark (Asset: `b2bc911ef6b644fdac02168609989b83`)

```css
:root {
  /* Tipografia */
  --font-display: 'DM Sans', 'Manrope', sans-serif;
  --font-body: 'IBM Plex Sans', 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Escala tipográfica */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 2rem;

  /* Cores — Superfícies (Hierarquia de Profundidade) */
  --color-bg-floor:     #0c0e14;  /* Level 0 — Shell profundo */
  --color-bg-primary:   #111319;  /* Level 1 — Workspace principal */
  --color-bg-secondary: #191b22;  /* Level 1.5 — Variação sutil */
  --color-bg-surface:   #1e1f26;  /* Level 2 — Sidebar, áreas secundárias */
  --color-bg-elevated:  #282a30;  /* Level 3 — Cards, superfícies interativas */
  --color-bg-highest:   #33343b;  /* Level 4 — Tooltips, popovers */

  /* Cores — Texto */
  --color-text-primary:   #e2e2eb;  /* Alta ênfase */
  --color-text-secondary: #c3c6d7;  /* Média ênfase */
  --color-text-muted:     #8d90a0;  /* Baixa ênfase / placeholders */

  /* Cores — Acento (Azul Corporativo) */
  --color-accent:           #3B82F6;  /* Ações primárias */
  --color-accent-hover:     #2563EB;  /* Hover state */
  --color-accent-light:     #adc6ff;  /* Texto sobre fundo escuro */
  --color-accent-container: #0f69dc;  /* Container de acento */
  --color-accent-subtle:    rgba(59, 130, 246, 0.12);

  /* Cores — Bordas */
  --color-border:         #434655;  /* Borda sutil (outline_variant) */
  --color-border-visible: #8d90a0;  /* Borda visível (outline) */

  /* Cores — Status */
  --color-success: #22c55e;
  --color-warning: #eab308;
  --color-error:   #ef4444;

  /* Cores — Secundário */
  --color-secondary:           #c3c5dc;
  --color-secondary-container: #45485b;

  /* Espaçamento */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
  --space-16: 4rem;

  /* Bordas */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 12px;

  /* Sombras */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
  --shadow-blue: 0 4px 12px rgba(59, 130, 246, 0.05);

  /* Transições */
  --transition-fast: 150ms ease;
  --transition-base: 250ms ease;
}
```

### Princípios Visuais

1. **Dark-first** — tema escuro como padrão, coerente com dashboards de monitoramento
2. **Hierarquia por superfície** — 5 níveis de profundidade (`floor` → `primary` → `surface` → `elevated` → `highest`), sem sombras pesadas
3. **Regra "No-Line"** — bordas 1px sólidas proibidas para separação de seções; usar contraste de superfícies
4. **Tipografia com caráter** — DM Sans para headings (geométrica, moderna), IBM Plex Sans para corpo (legível, profissional), JetBrains Mono para dados técnicos (CNPJ, IDs)
5. **Acento azul contido** — cor de destaque usada com parcimônia para ações e status ativo
6. **Tabelas como cidadão de primeira classe** — o sistema é data-heavy; tabelas devem ser legíveis, com hover states e alinhamento cuidadoso
7. **Sem branco puro** — texto máximo é `#e2e2eb`, não `#ffffff`; reduz fadiga visual em dark-mode

### Componentes do Design System (F01)

| Componente | Propósito | Variantes |
|-----------|-----------|-----------|
| `Table` | Exibição de dados tabulares | default (com hover row) |
| `PageHeader` | Título + descrição da página | default |
| `Loading` | Estado de carregamento | spinner, skeleton |
| `ErrorState` | Estado de erro com retry | default |
| `MainLayout` | Shell da aplicação (header + sidebar + content) | default |
| `Sidebar` | Navegação lateral por domínio | collapsed, expanded |
| `Header` | Barra superior com título do sistema | default |

---

## Design de Implementação

### Tipos (derivados do API Contract)

```typescript
// features/cadastro/associacoes/types/associacao.ts
export interface Associacao {
  id: string;
  sigla: string;
  nome: string;
  cnpj: string;
}

// shared/types/api.ts
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  traceId?: string;
}
```

### API Client

```typescript
// shared/services/apiClient.ts
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/v1';

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) {
    const problem = await response.json();
    throw problem; // ProblemDetails
  }
  return response.json();
}
```

### API da Feature

```typescript
// features/cadastro/associacoes/api/associacoesApi.ts
import { apiGet } from '@shared/services/apiClient';
import type { Associacao } from '../types/associacao';

export function getAssociacoes(): Promise<Associacao[]> {
  return apiGet<Associacao[]>('/associacoes');
}

export function getAssociacaoById(id: string): Promise<Associacao> {
  return apiGet<Associacao>(`/associacoes/${id}`);
}
```

### Hook de Data Fetching

```typescript
// features/cadastro/associacoes/hooks/useAssociacoes.ts
import { useQuery } from '@tanstack/react-query';
import { getAssociacoes } from '../api/associacoesApi';

export function useAssociacoes() {
  return useQuery({
    queryKey: ['associacoes'],
    queryFn: getAssociacoes,
    staleTime: Infinity, // dados imutáveis — nunca refetch automático
  });
}
```

### Página

```typescript
// features/cadastro/associacoes/pages/AssociacoesPage.tsx
export function AssociacoesPage() {
  const { data, isLoading, error } = useAssociacoes();

  if (isLoading) return <Loading />;
  if (error) return <ErrorState onRetry={() => refetch()} />;

  return (
    <>
      <PageHeader
        title="Associações"
        description="Associações de gestão coletiva do ECAD"
      />
      <AssociacoesTable data={data} />
    </>
  );
}
```

### Router

```typescript
// app/router/routes.tsx
const CadastroRoutes = lazy(() => import('@features/cadastro'));

export const routes = [
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <Navigate to="/cadastro/associacoes" /> },
      { path: 'cadastro/*', element: <CadastroRoutes /> },
    ],
  },
];
```

### Sidebar — Navegação por Domínio

```typescript
const navigation = [
  {
    label: 'Cadastro',
    icon: DatabaseIcon,
    children: [
      { label: 'Associações', path: '/cadastro/associacoes' },
      // F02+: Titulares, Obras, Fonogramas...
    ],
  },
  // Fase 2+:
  // { label: 'Identificação', icon: SearchIcon, children: [...] },
  // { label: 'Arrecadação', icon: BanknoteIcon, children: [...] },
  // Fase 3+:
  // { label: 'Distribuição', icon: SplitIcon, children: [...] },
];
```

---

## Inventário de Artefatos

### Arquivos a Criar

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| **Raiz do projeto** | | |
| `frontend/package.json` | Config | Dependências: react, react-dom, react-router, @tanstack/react-query, lucide-react |
| `frontend/vite.config.ts` | Config | Plugins, path aliases (@/, @shared/, @features/) |
| `frontend/tsconfig.json` | Config | Strict mode, path aliases espelhados |
| `frontend/tsconfig.node.json` | Config | Config para vite.config.ts |
| `frontend/index.html` | HTML | Entry point com Google Fonts (DM Sans, IBM Plex Sans, JetBrains Mono) |
| `frontend/.env.example` | Config | VITE_API_BASE_URL=http://localhost:5001/api/v1 |
| `frontend/.gitignore` | Config | node_modules, dist, .env |
| `frontend/DESIGN.md` | Design System | Tokens, tipografia, cores, componentes, princípios visuais |
| **Entrada da aplicação** | | |
| `frontend/src/main.tsx` | Entry | ReactDOM.createRoot + App |
| `frontend/src/App.tsx` | Root | AppProviders wrapper |
| `frontend/src/global.css` | Estilos | CSS variables (tokens), reset, fonts, estilos globais |
| **App (providers + router)** | | |
| `frontend/src/app/providers/AppProviders.tsx` | Provider | QueryClientProvider + BrowserRouter |
| `frontend/src/app/router/routes.tsx` | Router | Rotas com lazy loading por domínio |
| **Shared — UI Components** | | |
| `frontend/src/shared/components/ui/table/Table.tsx` | Componente | Tabela genérica reutilizável |
| `frontend/src/shared/components/ui/table/Table.module.css` | Estilos | Estilos da tabela |
| `frontend/src/shared/components/ui/table/index.ts` | Export | Public API |
| `frontend/src/shared/components/ui/page-header/PageHeader.tsx` | Componente | Título + descrição de página |
| `frontend/src/shared/components/ui/page-header/PageHeader.module.css` | Estilos | Estilos do header |
| `frontend/src/shared/components/ui/page-header/index.ts` | Export | Public API |
| `frontend/src/shared/components/ui/loading/Loading.tsx` | Componente | Spinner/skeleton de carregamento |
| `frontend/src/shared/components/ui/loading/Loading.module.css` | Estilos | Animação de loading |
| `frontend/src/shared/components/ui/loading/index.ts` | Export | Public API |
| `frontend/src/shared/components/ui/error-state/ErrorState.tsx` | Componente | Estado de erro com botão retry |
| `frontend/src/shared/components/ui/error-state/ErrorState.module.css` | Estilos | Estilos do error state |
| `frontend/src/shared/components/ui/error-state/index.ts` | Export | Public API |
| **Shared — Layout** | | |
| `frontend/src/shared/components/layout/main-layout/MainLayout.tsx` | Layout | Shell: Header + Sidebar + Content area |
| `frontend/src/shared/components/layout/main-layout/MainLayout.module.css` | Estilos | Grid layout da aplicação |
| `frontend/src/shared/components/layout/main-layout/index.ts` | Export | Public API |
| `frontend/src/shared/components/layout/sidebar/Sidebar.tsx` | Layout | Navegação lateral por domínio |
| `frontend/src/shared/components/layout/sidebar/Sidebar.module.css` | Estilos | Estilos da sidebar |
| `frontend/src/shared/components/layout/sidebar/index.ts` | Export | Public API |
| `frontend/src/shared/components/layout/header/Header.tsx` | Layout | Barra superior (título mini-ECAD) |
| `frontend/src/shared/components/layout/header/Header.module.css` | Estilos | Estilos do header |
| `frontend/src/shared/components/layout/header/index.ts` | Export | Public API |
| **Shared — Services, Types, Config** | | |
| `frontend/src/shared/services/apiClient.ts` | Service | Fetch wrapper com base URL e error handling |
| `frontend/src/shared/types/api.ts` | Tipos | ProblemDetails, tipos genéricos |
| `frontend/src/shared/types/index.ts` | Export | Re-exports |
| `frontend/src/shared/hooks/useDocumentTitle.ts` | Hook | Atualiza document.title por página |
| `frontend/src/shared/config/env.ts` | Config | Variáveis de ambiente tipadas via import.meta.env |
| **Feature — Cadastro / Associações** | | |
| `frontend/src/features/cadastro/associacoes/api/associacoesApi.ts` | API | getAssociacoes, getAssociacaoById |
| `frontend/src/features/cadastro/associacoes/components/AssociacoesTable.tsx` | Componente | Tabela específica das associações (sigla, nome, CNPJ) |
| `frontend/src/features/cadastro/associacoes/hooks/useAssociacoes.ts` | Hook | TanStack Query — useQuery com staleTime Infinity |
| `frontend/src/features/cadastro/associacoes/pages/AssociacoesPage.tsx` | Página | Composição: PageHeader + AssociacoesTable + loading/error |
| `frontend/src/features/cadastro/associacoes/types/associacao.ts` | Tipos | Interface Associacao (id, sigla, nome, cnpj) |
| `frontend/src/features/cadastro/associacoes/index.ts` | Export | Public API da feature |
| `frontend/src/features/cadastro/index.ts` | Export | Routes do domínio Cadastro |

### Arquivos a Modificar

Nenhum — projeto greenfield.

### Arquivos de Referência (não alterar)

| Caminho | Motivo |
|---------|--------|
| `tasks/prd-seed-associacoes/prd.md` | Requisitos funcionais RF-05 a RF-07 (tela read-only) |
| `tasks/prd-seed-associacoes/api-contract.yaml` | Schema AssociacaoResponse — fonte de verdade para tipos TS |
| `tasks/prd-seed-associacoes/api-contract.md` | Exemplos de response para desenvolvimento |
| `vision.md` | Domínios do roadmap (informam estrutura de navegação) |
| `domains/cadastro/domain.md` | Features do domínio (informam sidebar) |

---

## Dependências (package.json)

### Produção

| Pacote | Versão | Propósito |
|--------|--------|-----------|
| `react` | ^19 | UI library |
| `react-dom` | ^19 | React DOM renderer |
| `react-router` | ^7 | Routing com lazy loading |
| `@tanstack/react-query` | ^5 | Data fetching, cache, loading/error states |
| `lucide-react` | ^0.460 | Ícones (sidebar, estados) |

### Desenvolvimento

| Pacote | Versão | Propósito |
|--------|--------|-----------|
| `vite` | ^6 | Build tool |
| `@vitejs/plugin-react-swc` | ^3 | React Fast Refresh com SWC |
| `typescript` | ^5.7 | Type checking |
| `@types/react` | ^19 | Tipos React |
| `@types/react-dom` | ^19 | Tipos React DOM |

---

## Análise de Impacto

| Componente Afetado | Tipo de Impacto | Descrição & Risco | Ação Requerida |
|---|---|---|---|
| Features F02-F08 (Cadastro) | Padrão herdado | Todas as features do domínio seguirão a mesma estrutura de pastas e padrões | Garantir que a fundação esteja sólida |
| Domínios D02-D04 | Padrão herdado | Novos domínios criarão pastas em `features/` seguindo o mesmo padrão | Documentar convenções no DESIGN.md |
| Backend cadastro-api | Integração | Frontend consome API via contrato. Mudanças no contrato impactam tipos TS | Manter api-contract.yaml como fonte de verdade |

---

## Abordagem de Testes

### Fase 1 (F01) — Manual

Dado que F01 é uma tela read-only com 7 registros estáticos, a abordagem inicial é teste manual:

- Verificar que a tela carrega as 7 associações com sigla, nome e CNPJ corretos
- Verificar estado de loading enquanto aguarda API
- Verificar estado de erro quando API indisponível (desligar backend)
- Verificar que não há botões de criar/editar/excluir

### Futuro (F02+)

À medida que features com interação forem implementadas, adicionar:
- Vitest + React Testing Library para testes unitários de componentes
- MSW (Mock Service Worker) para testes de integração com API mockada

---

## Sequenciamento de Desenvolvimento

### Ordem de Construção

1. **Projeto base** — `npm create vite`, package.json, tsconfig, vite.config (aliases), .env.example, .gitignore
2. **DESIGN.md** — tokens de design, tipografia, cores, princípios visuais
3. **Global CSS** — CSS variables (tokens), reset, font imports
4. **Shared types** — ProblemDetails, tipos genéricos de API
5. **API client** — fetch wrapper com base URL e error handling
6. **Layout** — MainLayout, Header, Sidebar (navegação por domínio com "Cadastro > Associações")
7. **UI Components** — Table, PageHeader, Loading, ErrorState
8. **Router** — routes com lazy loading, redirect `/` → `/cadastro/associacoes`
9. **Feature F01** — types, api, hook (useAssociacoes), AssociacoesTable, AssociacoesPage
10. **Providers** — AppProviders (QueryClient + Router), App.tsx, main.tsx

### Dependências Técnicas

- Node.js 20+ instalado
- Backend `cadastro-api` rodando em `localhost:5001` (ou mock via Prism)
- Google Fonts acessível (DM Sans, IBM Plex Sans, JetBrains Mono)

---

## Monitoramento e Observabilidade

- Console errors logados em desenvolvimento
- TanStack Query DevTools habilitado em dev (`@tanstack/react-query-devtools`)
- Sem telemetria de produção nesta PoC

---

## Considerações Técnicas

### Decisões Principais

| Decisão | Alternativas Consideradas | Justificativa |
|---------|--------------------------|---------------|
| CSS Modules | Tailwind, Styled Components, CSS-in-JS | Encapsulamento nativo, zero runtime, coerente com design system próprio via CSS variables |
| TanStack Query | SWR, fetch manual + useState | Cache, loading/error states, staleTime Infinity para dados imutáveis; melhor DX |
| Fetch nativo | Axios, ky | Zero dependências adicionais; suficiente para GET simples; interceptors não necessários na PoC |
| Dark theme | Light theme, dual theme | Coerente com dashboards de monitoramento; diferencia de "apps corporativos genéricos" |
| Lucide icons | Heroicons, Phosphor, FontAwesome | Tree-shakeable, React-native, leve, boa variedade |
| React 19 | React 18 | Projeto greenfield; usar versão mais recente |

### Riscos Conhecidos

| Risco | Mitigação |
|-------|-----------|
| CORS entre frontend (:5173) e backend (:5001) em dev | Backend deve configurar CORS para `localhost:5173`; documentar no .env.example |
| Google Fonts indisponível offline | Fallback para system fonts no CSS (`sans-serif`, `monospace`) |
| Dark theme pode não funcionar bem com componentes futuros (dropdowns, modais) | Design system com CSS variables permite trocar cores sem refactor |

### Conformidade com Padrões

- [x] Estrutura intermediária com features por domínio (skill `react-architecture`)
- [x] Path aliases `@/`, `@shared/`, `@features/` (HARD RULE PA-01, PA-02)
- [x] Pastas em `kebab-case`, componentes em `PascalCase.tsx` (HARD RULES CP-01, CP-02)
- [x] `index.ts` em toda feature e componente reutilizável (HARD RULES CP-04, CP-05)
- [x] Design system com direção estética intencional (skill `frontend-design`)
- [x] Tipos derivados do API Contract (fonte de verdade)

### Mapeamento de Requisitos para Implementação

| Requisito (PRD) | Componente Frontend |
|------------------|-------------------|
| RF-05 (tela tabular com sigla, nome, CNPJ) | `AssociacoesTable` + `Table` (shared) |
| RF-06 (acessível por ambos os perfis) | Sem auth — acesso livre na PoC |
| RF-07 (sem botões de CRUD) | `AssociacoesPage` sem actions; `AssociacoesTable` read-only |
| RF-08 (API lista) | `useAssociacoes` → `getAssociacoes()` → `GET /api/v1/associacoes` |

---

*Tech Spec Frontend gerada com a skill `flow-techspec-creator`. Para gerar as tarefas de implementação, use a skill `flow-task-creator` fornecendo este arquivo como contexto.*
