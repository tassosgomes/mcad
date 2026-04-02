---
status: done
parallelizable: true
blocked_by: ["9.0"]
---

<task_context>
<domain>frontend/ui</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies></dependencies>
<unblocks>"12.0"</unblocks>
</task_context>

# Tarefa 11.0: Shared UI Components — Table, PageHeader, Loading, ErrorState

## Relacionada às User Stories

- [HU-01] Consultar associações (direta — Table e PageHeader)

## Visão Geral

Criar os 4 componentes reutilizáveis do design system que serão usados pela feature F01 e por todas as features futuras: Table (dados tabulares), PageHeader (título de página), Loading (carregamento) e ErrorState (erro com retry).

## Requisitos

- Table genérica com tipagem TypeScript (colunas configuráveis via props)
- PageHeader com título e descrição
- Loading com spinner animado (CSS-only)
- ErrorState com mensagem e botão retry
- CSS Modules para cada componente
- Usar tokens do design system
- Cada componente com `index.ts`

## Arquivos Envolvidos

- **Criar:**
  - `frontend/src/shared/components/ui/table/Table.tsx`
  - `frontend/src/shared/components/ui/table/Table.module.css`
  - `frontend/src/shared/components/ui/table/index.ts`
  - `frontend/src/shared/components/ui/page-header/PageHeader.tsx`
  - `frontend/src/shared/components/ui/page-header/PageHeader.module.css`
  - `frontend/src/shared/components/ui/page-header/index.ts`
  - `frontend/src/shared/components/ui/loading/Loading.tsx`
  - `frontend/src/shared/components/ui/loading/Loading.module.css`
  - `frontend/src/shared/components/ui/loading/index.ts`
  - `frontend/src/shared/components/ui/error-state/ErrorState.tsx`
  - `frontend/src/shared/components/ui/error-state/ErrorState.module.css`
  - `frontend/src/shared/components/ui/error-state/index.ts`
- **Referência:**
  - `frontend/DESIGN.md` — fonte de verdade para tokens, cores, componentes (seção 7: Data Tables, Node Chip)
  - Stitch screen `28d9d5dde6be44c0b3b307bb311051c0` — referência visual pixel-perfect para Table
- **Skills para consultar:**
  - `react-architecture` — convenções de pastas de componente
  - `frontend-design` — estética, hierarquia visual

## Subtarefas

- [ ] 11.1 Criar `Table` genérica com props tipadas (columns, data, keyExtractor)
- [ ] 11.2 Criar `PageHeader` com título (DM Sans) e descrição (IBM Plex Sans)
- [ ] 11.3 Criar `Loading` com spinner CSS-only usando `--color-accent`
- [ ] 11.4 Criar `ErrorState` com ícone, mensagem e botão retry
- [ ] 11.5 Criar `index.ts` para cada componente
- [ ] 11.6 Verificar: `npm run build`

## Sequenciamento

- Bloqueado por: 9.0
- Desbloqueia: 12.0
- Paralelizável: Sim — pode executar em paralelo com 10.0

## Detalhes de Implementação

### Table (genérica tipada)

```typescript
interface Column<T> {
  key: keyof T;
  header: string;
  render?: (value: T[keyof T], item: T) => React.ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
}

export function Table<T>({ columns, data, keyExtractor }: TableProps<T>) { ... }
```

### Table CSS

```css
.table {
  width: 100%;
  border-collapse: collapse;
}
.th {
  text-align: left;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: var(--space-3) var(--space-4);
  background-color: var(--color-bg-surface);
}
.td {
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  border-bottom: 1px solid var(--color-border);
}
.tr:hover {
  background-color: var(--color-bg-elevated);
}
```

### PageHeader

```typescript
interface PageHeaderProps {
  title: string;
  description?: string;
}
```

### Loading (CSS-only spinner)

```css
.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### ErrorState

```typescript
interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}
```

**Convenções visuais:**
- Table headers: `--font-display`, uppercase, `--color-text-muted`
- Table rows: hover com `--color-bg-elevated`
- Dados técnicos (CNPJ): usar `--font-mono`
- Sem branco puro em nenhum componente

## Critérios de Sucesso (Verificáveis)

- [ ] `npm run build` compila sem erros
- [ ] Table aceita tipagem genérica (colunas de qualquer tipo)
- [ ] Loading mostra spinner animado (CSS-only)
- [ ] ErrorState mostra botão retry que chama callback
- [ ] Cada componente tem `index.ts` com exports
- [ ] Todas as cores vêm de CSS variables
