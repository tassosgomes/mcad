# DESIGN.md — MCAD (Mini-ECAD) Design System

> **Projeto Stitch:** mcad (ID: `533156784329699726`)
> **Design System:** Circuit Core Dark (Asset: `b2bc911ef6b644fdac02168609989b83`)
> **Data:** 2026-03-29

---

## 1. Visão Geral & North Star Criativo

**North Star: The Monolithic Interface**

O MCAD rejeita a estética genérica de "web page" em favor de uma interface de alta performance, com qualidade de instrumento de engenharia. A inspiração vem de telemetria aeroespacial e software de engenharia de alto nível — onde foco é um recurso e clareza é a utilidade primária.

Para quebrar o visual de "template padrão", empregamos **Assimetria Intencional** e **Profundidade Tonal**. Em vez de encaixar conteúdo em grids rígidos com linhas, tratamos a UI como uma série de superfícies fresadas. A experiência deve parecer um console físico feito sob medida: pesado, deliberado e premium.

Alcançamos o "Premium" não através de dourados ou gradientes, mas pela **precisão extrema do alinhamento**, pelo **ritmo da densidade**, e pelo **uso sofisticado de valores "near-black"**.

### Referência Visual

O sistema público do ECAD (ecad.org.br) utiliza tema claro com acentos em azul e dourado/marrom. O MCAD é a versão **corporativa interna** — portanto:

- **Dark-first** — tema escuro como padrão, coerente com dashboards de monitoramento
- **Azul corporativo** como cor de acento principal — mais contido que o azul público do ECAD
- **Sem dourado/marrom** — substituído por hierarquia via camadas de superfície

### Público-Alvo

- **Analistas de Cadastro** — trabalham com dados de titulares, obras, fonogramas
- **Consultores** — consultam dados de referência
- **Ambiente:** Desktop (monitores de escritório)

---

## 2. Cores: The Depth of Noir

A paleta é um estudo em dessaturação. Utilizamos uma escala de tons "Ink" e "Steel" para criar hierarquia de foco.

### Tokens de Cor (CSS Variables)

```css
:root {
  /* ─── Superfícies (Hierarquia de Profundidade) ─── */
  --color-bg-floor:       #0c0e14;  /* Level 0 — Shell profundo */
  --color-bg-primary:     #111319;  /* Level 1 — Workspace principal */
  --color-bg-secondary:   #191b22;  /* Level 1.5 — Variação sutil */
  --color-bg-surface:     #1e1f26;  /* Level 2 — Sidebar, áreas secundárias */
  --color-bg-elevated:    #282a30;  /* Level 3 — Cards, superfícies interativas */
  --color-bg-highest:     #33343b;  /* Level 4 — Tooltips, popovers */

  /* ─── Texto ─── */
  --color-text-primary:   #e2e2eb;  /* Alta ênfase */
  --color-text-secondary: #c3c6d7;  /* Média ênfase */
  --color-text-muted:     #8d90a0;  /* Baixa ênfase / placeholders */

  /* ─── Acento (Azul Corporativo) ─── */
  --color-accent:         #3B82F6;  /* Ações primárias */
  --color-accent-hover:   #2563EB;  /* Hover state */
  --color-accent-light:   #adc6ff;  /* Texto sobre fundo escuro */
  --color-accent-container: #0f69dc; /* Container de acento */
  --color-accent-subtle:  rgba(59, 130, 246, 0.12); /* Background sutil */

  /* ─── Bordas ─── */
  --color-border:         #434655;  /* Borda sutil (outline_variant) */
  --color-border-visible: #8d90a0;  /* Borda visível (outline) */

  /* ─── Status ─── */
  --color-success:        #22c55e;
  --color-warning:        #eab308;
  --color-error:          #ef4444;
  --color-error-container: #93000a;

  /* ─── Secundário ─── */
  --color-secondary:      #c3c5dc;
  --color-secondary-container: #45485b;
}
```

### Regra "No-Line"

**Proibição:** Bordas de 1px sólidas são estritamente proibidas para separação de seções ou contenção de layout.

**Implementação:** Limites devem ser definidos exclusivamente por mudanças de cor de fundo. Uma sidebar (`--color-bg-surface`) contra o workspace principal (`--color-bg-primary`) cria uma aresta clara apenas pelo contraste de valor. Isso força um visual arquitetural mais limpo e sofisticado.

### Hierarquia de Superfícies

Trate a UI como uma pilha física. Quanto mais perto do usuário, "mais clara" a superfície:

| Nível | Token | Hex | Uso |
|-------|-------|-----|-----|
| 0 (Floor) | `--color-bg-floor` | `#0c0e14` | Shell profundo, backgrounds de página |
| 1 (Main) | `--color-bg-primary` | `#111319` | Workspace principal |
| 2 (Raised) | `--color-bg-surface` | `#1e1f26` | Sidebar, navegação secundária |
| 3 (Interactive) | `--color-bg-elevated` | `#282a30` | Cards, modais, superfícies interativas |
| 4 (Floating) | `--color-bg-highest` | `#33343b` | Tooltips, dropdowns, popovers |

---

## 3. Tipografia: Utilidade Editorial

Utilizamos uma tríade de fontes para separar **Intenção** (Headings), **Conteúdo** (Body) e **Precisão** (Data).

### Fontes

```css
:root {
  --font-display: 'DM Sans', 'Manrope', sans-serif;
  --font-body:    'IBM Plex Sans', 'Inter', sans-serif;
  --font-mono:    'JetBrains Mono', monospace;
}
```

| Fonte | Uso | Propriedades |
|-------|-----|-------------|
| **DM Sans** | Display, Headlines (`h1`–`h3`) | `letter-spacing: -0.02em` — autoritária e "editorial" |
| **IBM Plex Sans** | Body, Titles, Labels | Alma "técnica" que une documento corporativo e ferramenta de engenharia |
| **JetBrains Mono** | Dados numéricos (CNPJ, IDs, códigos) | Monospace garante alinhamento de decimais e evita layout shifts |

### Escala Tipográfica

```css
:root {
  --text-xs:  0.75rem;   /* 12px */
  --text-sm:  0.875rem;  /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg:  1.125rem;  /* 18px */
  --text-xl:  1.25rem;   /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 2rem;      /* 32px */
}
```

### Notas de Hierarquia

- **Headers de tabela:** `--text-sm` (1rem) em `text-transform: uppercase` com `letter-spacing: 0.05em` — sinaliza "Status do Sistema" em vez de "Narrativa do Usuário"
- **Dados de tabela:** `--font-mono` para qualquer número (CNPJ, IDs)
- **Corpo:** `--text-base` para texto corrido

---

## 4. Espaçamento

```css
:root {
  --space-1:  0.25rem;   /* 4px */
  --space-2:  0.5rem;    /* 8px */
  --space-3:  0.75rem;   /* 12px */
  --space-4:  1rem;      /* 16px */
  --space-6:  1.5rem;    /* 24px */
  --space-8:  2rem;      /* 32px */
  --space-12: 3rem;      /* 48px */
  --space-16: 4rem;      /* 64px */
}
```

---

## 5. Bordas e Raios

```css
:root {
  --radius-sm: 4px;      /* 0.25rem — chips, badges */
  --radius-md: 6px;      /* 0.375rem — botões, inputs */
  --radius-lg: 12px;     /* 0.75rem — cards, modais */
}
```

- **Botões:** `--radius-md` (6px) — moderno e levemente técnico
- **Evitar:** Shapes pill/full (border-radius: 999px) exceto para status chips

---

## 6. Elevação & Profundidade: Tonal Layering

Sombras tradicionais são "web-standard" demais. Usamos lógica de **Ambient Occlusion**.

### Princípios

- **Layering:** Profundidade por empilhamento. Um card `--color-bg-elevated` sobre `--color-bg-primary` tem delta tonal suficiente (~5% luminosidade) para ser percebido como "elevado" sem sombra
- **"Ghost Border" Fallback:** Se tabelas de alta densidade precisam de contenção, usar `--color-border` a **15% opacity**. Deve ser sentida, não vista
- **Glassmorphism (tooltips):** `--color-bg-surface` com `backdrop-filter: blur(20px)` e 80% opacity

```css
:root {
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
  --shadow-blue: 0 4px 12px rgba(59, 130, 246, 0.05); /* Sombra com tint azul — para modais */

  --transition-fast: 150ms ease;
  --transition-base: 250ms ease;
}
```

---

## 7. Componentes do Design System

### Data Tables (Core do Sistema)

O MCAD é data-heavy — tabelas são cidadãos de primeira classe.

| Propriedade | Valor |
|-------------|-------|
| **Header bg** | `--color-bg-elevated` (`#282a30`) |
| **Header text** | `--text-sm`, `uppercase`, `letter-spacing: 0.05em` |
| **Row bg** | `--color-bg-primary` (`#111319`) |
| **Row hover** | `--color-bg-surface` (`#1e1f26`) |
| **Cell padding** | `0.5rem` vertical, `1.1rem` horizontal |
| **Cell font** | `--font-body` (geral), `--font-mono` (números) |
| **Separadores** | Sem linhas horizontais — usar gap de 4px ou alternância de bg |

### Botões

| Variante | Background | Text | Uso |
|----------|-----------|------|-----|
| **Primary** | `--color-accent` (`#3B82F6`) | `#ffffff` | Ação principal |
| **Secondary** | `--color-border` a 20% opacity | `--color-text-primary` | Ação secundária |
| **Ghost** | `transparent` | `--color-text-secondary` | Ação terciária |
| **Destructive** | `--color-error` | `#ffffff` | Exclusão, perigo |

### Inputs

- **Background:** `--color-bg-floor` (`#0c0e14`) — parecer "fresado" na superfície
- **Border:** `none` por padrão
- **Focus:** `1px solid --color-accent` — única situação onde borda 1px é permitida
- **Placeholder:** `--color-text-muted`

### Node Chip (ECAD/MCAD Identification)

Para siglas das associações (ABRAMUS, UBC, etc.):

```css
.node-chip {
  font-family: var(--font-mono);
  background: var(--color-secondary-container);
  border-radius: var(--radius-sm);
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-sm);
  letter-spacing: 0.02em;
}
```

### Layout Shell

```
┌──────────────────────────────────────────────────┐
│ Header (--color-bg-surface)                       │
│  MCAD │ SISTEMA v0.1  │ 🔍 Pesquisar... │ 👤    │
├──────┬───────────────────────────────────────────┤
│      │                                           │
│ Side │  Page Content (--color-bg-primary)        │
│ bar  │                                           │
│      │  ┌─ PageHeader ─────────────────────┐    │
│ (bg- │  │ Título da Página                  │    │
│ sur- │  │ Descrição                         │    │
│ face)│  └──────────────────────────────────┘    │
│      │                                           │
│      │  ┌─ Table ──────────────────────────┐    │
│      │  │ SIGLA │ NOME COMPLETO   │ CNPJ   │    │
│      │  │───────│─────────────────│────────│    │
│      │  │ ...   │ ...             │ ...    │    │
│      │  └──────────────────────────────────┘    │
│      │                                           │
└──────┴───────────────────────────────────────────┘
```

### Sidebar — Navegação por Domínio

```
MÓDULOS
┌────────────────────┐
│ 📊 Cadastro        │ ← Expandido
│   ▸ Associações ●  │ ← Ativo (--color-accent)
│   ▸ Titulares      │
│   ▸ Obras e Fonogr.│
│                    │
│ 🔍 Identificação   │ ← Futuro (disabled)
│ 💰 Arrecadação     │ ← Futuro (disabled)
│ 📤 Distribuição    │ ← Futuro (disabled)
└────────────────────┘
```

---

## 8. Do's and Don'ts

### ✅ Do

- **Usar Assimetria:** Navegação primária à esquerda, metadados secundários à direita, criando "respiro" em views densas
- **Confiar no Monospace:** JetBrains Mono para QUALQUER número. Alinha decimais automaticamente
- **Abraçar o Dark:** Usar `--color-bg-floor` para "escavar" áreas de foco dentro do layout
- **Dados tabulares limpos:** Sem decorações desnecessárias em tabelas — foco na legibilidade dos dados

### ❌ Don't

- **Não usar sombras cinza:** Se sombra for necessária para modal, usar sombra com tint azul (`--shadow-blue`)
- **Não usar branco puro (#FFFFFF):** Todo texto deve ser `--color-text-primary` (#e2e2eb). Branco puro é harsh demais para dark-mode e causa fadiga visual
- **Sem linhas decorativas:** Se sentir necessidade de uma divider line, tentar `--space-4` de whitespace. 90% das vezes, espaço é mais efetivo
- **Sem gradientes decorativos:** Profundidade vem de camadas, não de gradientes

---

## 9. Google Fonts — Imports

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=IBM+Plex+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

---

## 10. Mapeamento Stitch → Código

| Stitch (Design System) | Código (CSS Variables) |
|-------------------------|----------------------|
| `surface` (#111319) | `--color-bg-primary` |
| `surface_container` (#1e1f26) | `--color-bg-surface` |
| `surface_container_high` (#282a30) | `--color-bg-elevated` |
| `surface_container_lowest` (#0c0e14) | `--color-bg-floor` |
| `on_surface` (#e2e2eb) | `--color-text-primary` |
| `on_surface_variant` (#c3c6d7) | `--color-text-secondary` |
| `outline` (#8d90a0) | `--color-text-muted` / `--color-border-visible` |
| `outline_variant` (#434655) | `--color-border` |
| `primary` (#adc6ff) | `--color-accent-light` |
| `primary_container` (#0f69dc) | `--color-accent-container` |
| Manrope | DM Sans (`--font-display`) |
| Inter | IBM Plex Sans (`--font-body`) |
| — | JetBrains Mono (`--font-mono`) |

---

*Design System documentado a partir do projeto Stitch "mcad" (ID: 533156784329699726). Tokens devem ser implementados como CSS Variables no `global.css`.*
