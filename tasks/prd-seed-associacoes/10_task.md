---
status: done
parallelizable: true
blocked_by: ["9.0"]
---

<task_context>
<domain>frontend/layout</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies></dependencies>
<unblocks>"12.0"</unblocks>
</task_context>

# Tarefa 10.0: Layout — MainLayout, Header e Sidebar

## Relacionada às User Stories

- Suporte a todas as HUs — shell da aplicação

## Visão Geral

Criar os componentes de layout que formam o shell da aplicação: Header (barra superior com título "mini-ECAD"), Sidebar (navegação por domínio com menu colapsável) e MainLayout (composição Header + Sidebar + Content area com CSS Grid).

## Requisitos

- MainLayout com CSS Grid: header fixo no topo, sidebar à esquerda, content area scrollável
- Header com título "mini-ECAD" e subtítulo "Sistema de Gestão de Direitos Autorais"
- Sidebar com navegação por domínio (Cadastro > Associações) — preparada para features futuras
- CSS Modules para encapsulamento
- Responsivo (sidebar colapsável em telas menores)
- Usar tokens do design system (sem cores hardcoded)

## Arquivos Envolvidos

- **Criar:**
  - `frontend/src/shared/components/layout/main-layout/MainLayout.tsx`
  - `frontend/src/shared/components/layout/main-layout/MainLayout.module.css`
  - `frontend/src/shared/components/layout/main-layout/index.ts`
  - `frontend/src/shared/components/layout/header/Header.tsx`
  - `frontend/src/shared/components/layout/header/Header.module.css`
  - `frontend/src/shared/components/layout/header/index.ts`
  - `frontend/src/shared/components/layout/sidebar/Sidebar.tsx`
  - `frontend/src/shared/components/layout/sidebar/Sidebar.module.css`
  - `frontend/src/shared/components/layout/sidebar/index.ts`
- **Referência:**
  - `frontend/DESIGN.md` — fonte de verdade para tokens, cores, princípios visuais, layout shell (seção 7)
  - `vision.md` (domínios do roadmap — informam itens do menu)
  - Stitch screen `28d9d5dde6be44c0b3b307bb311051c0` — referência visual pixel-perfect
- **Skills para consultar:**
  - `react-architecture` — convenções de pastas, index.ts, CSS Modules
  - `frontend-design` — layout, hierarquia visual, dark theme

## Subtarefas

- [ ] 10.1 Criar `MainLayout` com CSS Grid (header + sidebar + content)
- [ ] 10.2 Criar `Header` com título e subtítulo usando `--font-display`
- [ ] 10.3 Criar `Sidebar` com navegação hierárquica (domínio > features)
- [ ] 10.4 Implementar menu items para Cadastro > Associações (ativo) + placeholders futuros
- [ ] 10.5 Criar `index.ts` para cada componente
- [ ] 10.6 Verificar: `npm run build`

## Sequenciamento

- Bloqueado por: 9.0
- Desbloqueia: 12.0
- Paralelizável: Sim — pode executar em paralelo com 11.0

## Detalhes de Implementação

### MainLayout (CSS Grid)

```css
.layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  grid-template-rows: 56px 1fr;
  grid-template-areas:
    "header header"
    "sidebar content";
  height: 100vh;
  background-color: var(--color-bg-floor);
}
```

### Sidebar Navigation

```typescript
const navigation = [
  {
    label: 'Cadastro',
    icon: Database,
    basePath: '/cadastro',
    children: [
      { label: 'Associações', path: '/cadastro/associacoes' },
      // Futuras features (F02+):
      // { label: 'Titulares', path: '/cadastro/titulares' },
      // { label: 'Obras', path: '/cadastro/obras' },
      // { label: 'Fonogramas', path: '/cadastro/fonogramas' },
    ],
  },
  // Fases futuras (desabilitados):
  // { label: 'Identificação', icon: Search, basePath: '/identificacao', disabled: true },
  // { label: 'Arrecadação', icon: Banknote, basePath: '/arrecadacao', disabled: true },
  // { label: 'Distribuição', icon: Split, basePath: '/distribuicao', disabled: true },
];
```

**Convenções visuais:**
- Header: `--color-bg-primary`, borda inferior com `--color-border` (exceção à regra No-Line para separação header/content)
- Sidebar: `--color-bg-surface`, item ativo com `--color-accent-subtle` background
- Content: `--color-bg-primary`
- Ícones: `lucide-react`
- Sem branco puro — texto máximo `--color-text-primary` (#e2e2eb)

## Critérios de Sucesso (Verificáveis)

- [ ] `npm run build` compila sem erros
- [ ] Layout exibe header + sidebar + content area
- [ ] Sidebar mostra "Cadastro > Associações" como item de menu
- [ ] Item ativo tem destaque visual
- [ ] Todas as cores vêm de CSS variables (nenhuma cor hardcoded)
- [ ] Cada componente tem `index.ts` com exports
