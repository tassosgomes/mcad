# Tech Spec — F04: Registro de Pagamentos (Frontend)

> **PRD:** `tasks/arrecadacao/prd-registro-pagamentos/prd.md`
> **API Contract:** `tasks/arrecadacao/prd-registro-pagamentos/api-contract.yaml`
> **Backend Tech Spec:** `tasks/arrecadacao/prd-registro-pagamentos/techspec.md`
> **Data:** 2026-04-05

---

## Resumo Executivo

Segunda feature frontend do domínio Arrecadação. Implementa duas áreas funcionais: (1) gestão da UDA com consulta de valor vigente, ajuste de valor e histórico; (2) registro e consulta de pagamentos em UDAs contra licenças. Introduz cálculo de preview em tempo real (`quantidadeUdas × valorUdaVigente`) e formatação de valores monetários como string decimal.

Reutiliza o `apiArrecadacaoClient` criado na F03, adiciona dois novos módulos de feature (`uda/` e `pagamentos/`) e novo sub-item "Pagamentos" no sidebar. Segue os padrões estabelecidos: TanStack Query, CSS Modules, formulários com estado manual, componentes de UI compartilhados.

---

## Skills de Referência

| Skill | Decisões Influenciadas |
|-------|------------------------|
| `react-architecture` | Feature modules, hooks pattern, page/component split |
| `react-code-quality` | TypeScript strict, types co-located, string decimal handling |

---

## Arquitetura do Sistema

### Visão Geral dos Componentes

```
src/features/arrecadacao/
├── uda/
│   ├── types/
│   │   └── uda.ts                        ← TypeScript types
│   ├── api/
│   │   └── udaApi.ts                     ← 3 funções HTTP (vigente, ajustar, historico)
│   ├── hooks/
│   │   ├── useUdaVigente.ts              ← useQuery
│   │   ├── useHistoricoUda.ts            ← useQuery
│   │   └── useAjustarUda.ts             ← useMutation
│   ├── components/
│   │   ├── UdaVigenteCard.tsx            ← Card com valor vigente destacado
│   │   ├── UdaHistoricoTable.tsx         ← Tabela de histórico
│   │   ├── AjustarUdaModal.tsx           ← Modal para novo valor
│   │   └── styles/                       ← CSS Modules
│   └── pages/
│       ├── UdaPage.tsx                   ← Página de gestão da UDA
│       └── UdaPage.module.css
│
├── pagamentos/
│   ├── types/
│   │   └── pagamento.ts                  ← TypeScript types
│   ├── api/
│   │   └── pagamentosApi.ts              ← 3 funções HTTP (listar, registrar, buscar)
│   ├── hooks/
│   │   ├── usePagamentos.ts              ← useQuery listagem paginada
│   │   ├── usePagamento.ts               ← useQuery detalhe
│   │   └── useRegistrarPagamento.ts      ← useMutation
│   ├── components/
│   │   ├── PagamentosTable.tsx           ← Tabela com UDAs + R$
│   │   ├── PagamentosFilters.tsx         ← 5 filtros
│   │   ├── RegistrarPagamentoForm.tsx    ← Formulário com preview valor
│   │   ├── StatusBadgePagamento.tsx      ← CONFIRMADO/ESTORNADO
│   │   └── styles/                       ← CSS Modules
│   └── pages/
│       ├── PagamentosPage.tsx            ← Listagem principal
│       ├── PagamentoCreatePage.tsx        ← Formulário de registro
│       ├── PagamentoDetailPage.tsx        ← Detalhes completos
│       └── styles/                       ← CSS Modules
```

---

## Design de Implementação

### Types (API Contract → TypeScript)

```typescript
// src/features/arrecadacao/uda/types/uda.ts

export interface UdaValor {
  id: string;
  valor: string;           // string decimal "107.310000"
  dataVigencia: string;    // ISO date "2026-01-01"
  criadoEm: string;        // ISO datetime
  criadoPor: string | null; // null for seed
}

export interface AjustarUdaRequest {
  valor: string;           // string decimal
  dataVigencia: string;    // ISO date
}
```

```typescript
// src/features/arrecadacao/pagamentos/types/pagamento.ts

export type StatusPagamento = 'CONFIRMADO' | 'ESTORNADO';

export interface LicencaResumo {
  id: string;
  status: string;
  usuarioMusica: {
    id: string;
    razaoSocial: string;
    cnpj: string;
  };
  rubrica: {
    id: string;
    sigla: string;
    nome: string;
  };
}

export interface Pagamento {
  id: string;
  licenca: LicencaResumo;
  quantidadeUdas: string;       // string decimal
  valorUdaNoMomento: string;    // string decimal (snapshot)
  valorBruto: string;           // string decimal
  periodo: string;              // "2026-04"
  status: StatusPagamento;
  dataRegistro: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface PagamentoListResponse {
  data: Pagamento[];
  pagination: {
    page: number;
    size: number;
    total: number;
    totalPages: number;
  };
}

export interface RegistrarPagamentoRequest {
  licencaId: string;
  quantidadeUdas: string;       // string decimal
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

### API Functions

```typescript
// src/features/arrecadacao/uda/api/udaApi.ts
export async function getUdaVigente(): Promise<UdaValor>
export async function ajustarUda(data: AjustarUdaRequest): Promise<UdaValor>
export async function getHistoricoUda(): Promise<UdaValor[]>

// src/features/arrecadacao/pagamentos/api/pagamentosApi.ts
export async function getPagamentos(filtros: PagamentoFiltros): Promise<PagamentoListResponse>
export async function registrarPagamento(data: RegistrarPagamentoRequest): Promise<Pagamento>
export async function getPagamentoById(id: string): Promise<Pagamento>
```

Usa `apiGetArr`, `apiPostArr` do `apiArrecadacaoClient` (criado no F03).

### Hooks (TanStack Query)

```typescript
// UDA hooks
export function useUdaVigente() {
  return useQuery({
    queryKey: ['uda', 'vigente'],
    queryFn: getUdaVigente,
    retry: false,  // 404 is expected when no UDA exists
  });
}

export function useHistoricoUda() {
  return useQuery({
    queryKey: ['uda', 'historico'],
    queryFn: getHistoricoUda,
  });
}

export function useAjustarUda() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ajustarUda,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uda'] });
    },
  });
}

// Pagamento hooks
export function usePagamentos(filtros: PagamentoFiltros) {
  return useQuery({
    queryKey: ['pagamentos', filtros],
    queryFn: () => getPagamentos(filtros),
  });
}

export function usePagamento(id: string) {
  return useQuery({
    queryKey: ['pagamentos', id],
    queryFn: () => getPagamentoById(id),
    enabled: !!id,
  });
}

export function useRegistrarPagamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: registrarPagamento,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pagamentos'] });
    },
  });
}
```

### Components

#### UdaVigenteCard

Card com destaque visual do valor vigente:
- Valor em R$ formatado grande (ex: **R$ 107,31**)
- Data de vigência: "Vigente desde 01/01/2026"
- Botão "Ajustar Valor" (apenas Analista)
- Se 404 (sem UDA): mensagem de alerta "Nenhum valor de UDA configurado"

#### UdaHistoricoTable

Tabela simples (sem paginação):
- Colunas: Valor (R$), Data Vigência, Criado Em, Criado Por ("Sistema" se null)
- Destaque visual na linha vigente (maior dataVigencia <= hoje)
- Ordenação: dataVigencia DESC (do backend)

#### AjustarUdaModal

Modal para inserir novo valor:
- Campo valor: input numérico com 2-6 casas decimais, validação > 0
- Campo dataVigencia: date picker (permite datas futuras para pré-agendamento)
- Botão Salvar
- Após sucesso: toast + fechar modal + refresh UdaVigenteCard

#### StatusBadgePagamento

Badge de status do pagamento:
- CONFIRMADO → verde (`--color-status-success`)
- ESTORNADO → vermelho (`--color-status-error`)

#### PagamentosTable

Colunas: Usuário (razaoSocial), Rubrica (sigla), Período, Qtd. UDAs, Valor (R$), Status (badge), link detalhes.

**Decisão: duas colunas monetárias** — "Qtd. UDAs" e "Valor (R$)" lado a lado para transparência.

#### PagamentosFilters

5 filtros com debounce 300ms:
- **Razão Social:** TextInput com debounce
- **Rubrica:** Select dropdown (7 opções)
- **Período:** Input type="month" (YYYY-MM)
- **Status:** Select (Todos / Confirmado / Estornado)
- **Reset filters** button

#### RegistrarPagamentoForm

Formulário de registro com preview em tempo real:

```
┌─────────────────────────────────────────┐
│ Selecionar Licença:                     │
│ [Autocomplete: busca por razão social]  │
│   → Exibe: Usuário | Rubrica | Status   │
│                                         │
│ UDA vigente: R$ 107,31                  │ ← useUdaVigente()
│                                         │
│ Quantidade de UDAs: [     5.5     ]     │
│                                         │
│ ═══════════════════════════════════════  │
│ Preview: 5.5 UDAs × R$ 107,31 =        │
│          R$ 590,21                      │ ← cálculo client-side em tempo real
│ ═══════════════════════════════════════  │
│                                         │
│ Período: Abril 2026 (auto)              │ ← read-only, mês atual
│                                         │
│              [Registrar Pagamento]       │
└─────────────────────────────────────────┘
```

**Cálculo preview:** `parseFloat(quantidadeUdas) * parseFloat(udaVigente.valor)` — formatado como R$ com 2 casas decimais. Nota: este é apenas preview; o backend calcula o valor final com BigDecimal.

**Validação client-side:**
- quantidadeUdas > 0
- Licença selecionada (não vazia)
- UDA vigente disponível (se 404, bloquear formulário)

**Seleção de licença:** Autocomplete buscando licenças ATIVAS e SUSPENSAS via `GET /licencas?status=ATIVA` e `GET /licencas?status=SUSPENSA` (reutiliza hook `useLicencas` do F03). Exibe razão social, rubrica e badge de status.

**Tratamento de erros:**
- 409 (duplicado): toast "Já existe pagamento para esta licença em [período]"
- 422 (encerrada): toast "Licença encerrada não pode receber pagamentos"
- 422 (sem UDA): toast "Nenhum valor de UDA configurado"

### Pages

#### UdaPage

```
┌─────────────────────────────────────────┐
│ PageHeader: "UDA — Unidade de Direito"  │
├─────────────────────────────────────────┤
│ UdaVigenteCard                          │
│   R$ 107,31  (vigente desde 01/01/2026) │
│                    [Ajustar Valor] ←Analista│
├─────────────────────────────────────────┤
│ UdaHistoricoTable                       │
│   Valor | Data Vigência | Criado | Autor│
└─────────────────────────────────────────┘
```

#### PagamentosPage

```
┌─────────────────────────────────────────┐
│ PageHeader: "Pagamentos"  [+ Novo]      │ ← Analista only
├─────────────────────────────────────────┤
│ PagamentosFilters                       │
├─────────────────────────────────────────┤
│ PagamentosTable                         │
├─────────────────────────────────────────┤
│ Pagination                              │
└─────────────────────────────────────────┘
```

#### PagamentoCreatePage

```
┌─────────────────────────────────────────┐
│ PageHeader: "Novo Pagamento"  [← Voltar]│
├─────────────────────────────────────────┤
│ RegistrarPagamentoForm                  │
└─────────────────────────────────────────┘
```

Redirect para detalhes após sucesso.

#### PagamentoDetailPage

```
┌─────────────────────────────────────────┐
│ PageHeader: "Pagamento #abc..."  [← Voltar]│
├─────────────────────────────────────────┤
│ Card: Dados do pagamento                │
│   Licença: ID | Usuário | Rubrica       │
│   Qtd. UDAs: 5.5                        │
│   Valor UDA (na data): R$ 107,31        │
│   Valor Bruto: R$ 590,21               │
│   Período: 2026-04                      │
│   Status: StatusBadgePagamento          │
│   Registrado em: dd/mm/yyyy hh:mm       │
├─────────────────────────────────────────┤
│ [Estornar] ← Analista, se CONFIRMADO   │ ← botão preparado, ação em F06
└─────────────────────────────────────────┘
```

**Nota:** Botão "Estornar" é renderizado condicionalmente (status === 'CONFIRMADO' && role === analista) mas a ação será implementada na F06. Por ora, pode ser `disabled` com tooltip "Disponível na próxima versão" ou simplesmente omitido.

### Routing

```typescript
// Adicionar em routes.tsx, dentro de /arrecadacao:
{
  path: 'uda',
  element: <RequireRole roles={['analista-arrecadacao', 'consultor-arrecadacao']}><UdaPage /></RequireRole>
},
{
  path: 'pagamentos',
  element: <RequireRole roles={['analista-arrecadacao', 'consultor-arrecadacao']}><PagamentosPage /></RequireRole>
},
{
  path: 'pagamentos/novo',
  element: <RequireRole roles={['analista-arrecadacao']}><PagamentoCreatePage /></RequireRole>
},
{
  path: 'pagamentos/:id',
  element: <RequireRole roles={['analista-arrecadacao', 'consultor-arrecadacao']}><PagamentoDetailPage /></RequireRole>
},
```

### Sidebar

Adicionar sub-itens na seção Arrecadação (já ativada no F03):

```typescript
children: [
  { label: 'Licenças', path: '/arrecadacao/licencas' },      // F03
  { label: 'Pagamentos', path: '/arrecadacao/pagamentos' },   // F04
  { label: 'UDA', path: '/arrecadacao/uda' },                 // F04
]
```

### Utilitário: Formatação Monetária

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

---

## Inventário de Artefatos

### Arquivos a Criar

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| `src/features/arrecadacao/shared/utils/formatCurrency.ts` | Util | formatBRL, formatUdas |
| `src/features/arrecadacao/uda/types/uda.ts` | Types | UdaValor, AjustarUdaRequest |
| `src/features/arrecadacao/uda/api/udaApi.ts` | API | 3 funções HTTP |
| `src/features/arrecadacao/uda/hooks/useUdaVigente.ts` | Hook | useQuery vigente |
| `src/features/arrecadacao/uda/hooks/useHistoricoUda.ts` | Hook | useQuery histórico |
| `src/features/arrecadacao/uda/hooks/useAjustarUda.ts` | Hook | useMutation |
| `src/features/arrecadacao/uda/components/UdaVigenteCard.tsx` | Component | Card valor vigente |
| `src/features/arrecadacao/uda/components/UdaVigenteCard.module.css` | Style | CSS Module |
| `src/features/arrecadacao/uda/components/UdaHistoricoTable.tsx` | Component | Tabela histórico |
| `src/features/arrecadacao/uda/components/UdaHistoricoTable.module.css` | Style | CSS Module |
| `src/features/arrecadacao/uda/components/AjustarUdaModal.tsx` | Component | Modal ajuste |
| `src/features/arrecadacao/uda/components/AjustarUdaModal.module.css` | Style | CSS Module |
| `src/features/arrecadacao/uda/pages/UdaPage.tsx` | Page | Gestão completa UDA |
| `src/features/arrecadacao/uda/pages/UdaPage.module.css` | Style | CSS Module |
| `src/features/arrecadacao/pagamentos/types/pagamento.ts` | Types | Pagamento, filtros, requests |
| `src/features/arrecadacao/pagamentos/api/pagamentosApi.ts` | API | 3 funções HTTP |
| `src/features/arrecadacao/pagamentos/hooks/usePagamentos.ts` | Hook | useQuery listagem |
| `src/features/arrecadacao/pagamentos/hooks/usePagamento.ts` | Hook | useQuery detalhe |
| `src/features/arrecadacao/pagamentos/hooks/useRegistrarPagamento.ts` | Hook | useMutation |
| `src/features/arrecadacao/pagamentos/components/PagamentosTable.tsx` | Component | Tabela UDAs + R$ |
| `src/features/arrecadacao/pagamentos/components/PagamentosTable.module.css` | Style | CSS Module |
| `src/features/arrecadacao/pagamentos/components/PagamentosFilters.tsx` | Component | 5 filtros |
| `src/features/arrecadacao/pagamentos/components/PagamentosFilters.module.css` | Style | CSS Module |
| `src/features/arrecadacao/pagamentos/components/RegistrarPagamentoForm.tsx` | Component | Form com preview |
| `src/features/arrecadacao/pagamentos/components/RegistrarPagamentoForm.module.css` | Style | CSS Module |
| `src/features/arrecadacao/pagamentos/components/StatusBadgePagamento.tsx` | Component | Badge CONFIRMADO/ESTORNADO |
| `src/features/arrecadacao/pagamentos/components/StatusBadgePagamento.module.css` | Style | CSS Module |
| `src/features/arrecadacao/pagamentos/pages/PagamentosPage.tsx` | Page | Listagem |
| `src/features/arrecadacao/pagamentos/pages/PagamentosPage.module.css` | Style | CSS Module |
| `src/features/arrecadacao/pagamentos/pages/PagamentoCreatePage.tsx` | Page | Formulário registro |
| `src/features/arrecadacao/pagamentos/pages/PagamentoCreatePage.module.css` | Style | CSS Module |
| `src/features/arrecadacao/pagamentos/pages/PagamentoDetailPage.tsx` | Page | Detalhes |
| `src/features/arrecadacao/pagamentos/pages/PagamentoDetailPage.module.css` | Style | CSS Module |

### Arquivos a Modificar

| Caminho | Alteração |
|---------|-----------|
| `src/app/router/routes.tsx` | Adicionar 4 rotas (/uda, /pagamentos, /pagamentos/novo, /pagamentos/:id) |
| `src/shared/components/layout/sidebar/Sidebar.tsx` | Adicionar sub-itens "Pagamentos" e "UDA" na seção Arrecadação |

### Arquivos de Referência (não alterar)

| Caminho | Motivo |
|---------|--------|
| `src/shared/services/apiArrecadacaoClient.ts` | Client HTTP reutilizado (criado F03) |
| `src/features/arrecadacao/licencas/hooks/useLicencas.ts` | Reutilizar para autocomplete de licença no form |
| `src/features/arrecadacao/licencas/types/licenca.ts` | Tipos de Licenca para seleção |
| `src/features/arrecadacao/licencas/components/StatusBadgeLicenca.tsx` | Padrão badge status |
| `src/features/cadastro/titulares/components/TitularesFilters.tsx` | Padrão filtros debounce |
| `src/shared/components/ui/modal/` | Modal genérico |
| `src/shared/components/ui/table/` | Table genérico |
| `src/shared/components/ui/pagination/` | Pagination |
| `src/shared/components/ui/autocomplete/` | Autocomplete seleção licença |
| `src/shared/hooks/useDebounce.ts` | Debounce filtros |
| `tasks/arrecadacao/prd-registro-pagamentos/api-contract.yaml` | Contratos |

---

## Análise de Impacto

| Componente | Tipo | Descrição & Risco | Ação |
|------------|------|-------------------|------|
| `routes.tsx` | Extensão | 4 novas rotas. Baixo risco | Lazy loading |
| `Sidebar.tsx` | Extensão | 2 novos sub-itens. Baixo risco | Adicionar ao children existente |
| F03 Licenças (frontend) | Dependência | Reutiliza `useLicencas` para autocomplete | F03 frontend deve estar implementado |
| F06 Estorno (futuro) | Preparação | Botão "Estornar" preparado na detail page | Apenas visual, ação em F06 |

---

## Sequenciamento de Desenvolvimento

1. **Utilitário formatCurrency** — formatBRL, formatUdas (compartilhado)
2. **UDA: Types + API + Hooks** — camada de dados
3. **UDA: Components** — UdaVigenteCard, UdaHistoricoTable, AjustarUdaModal
4. **UDA: Page** — UdaPage
5. **Pagamentos: Types + API + Hooks** — camada de dados
6. **Pagamentos: Components** — Table, Filters, Form (com preview), StatusBadge
7. **Pagamentos: Pages** — PagamentosPage, PagamentoCreatePage, PagamentoDetailPage
8. **Routing + Sidebar** — integração final

### Dependências Técnicas

- Backend F04 implementado (6 endpoints disponíveis)
- Frontend F03 implementado (apiArrecadacaoClient, useLicencas para autocomplete, sidebar ativada)

---

## Considerações Técnicas

### Decisões Principais

| Decisão | Justificativa |
|---------|---------------|
| Dois módulos separados (`uda/` e `pagamentos/`) | Domínios funcionais distintos com ciclos de vida diferentes |
| `formatCurrency` em `arrecadacao/shared/utils/` | Reutilizável entre pagamentos, UDA e futuro F05 (verbas) |
| Preview client-side com `parseFloat` | Aproximação visual suficiente; backend calcula valor real com BigDecimal |
| Autocomplete de licença reutilizando `useLicencas` do F03 | Evita duplicação; filtra por status ATIVA/SUSPENSA |
| Campo período read-only (mês atual formatado) | Backend preenche; frontend apenas exibe para transparência |
| Botão "Estornar" preparado mas não funcional | F06 implementará a ação; evita retrabalho no layout |
| UDA histórico sem paginação | Volume naturalmente pequeno (ajustes periódicos) |

### Riscos Conhecidos

| Risco | Mitigação |
|-------|-----------|
| Precisão float no preview client-side | Label "valor aproximado" + backend calcula valor final |
| UDA 404 bloqueia registro de pagamento | Exibir alerta proeminente no form; desabilitar botão |
| Muitas licenças no autocomplete | Debounce 300ms + server-side filter (size=10) |

---

*Tech Spec gerada com a skill `flow-techspec-creator`. Para gerar as tarefas de implementação, use a skill `flow-task-creator`.*
