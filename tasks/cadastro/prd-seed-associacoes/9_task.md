---
status: done
parallelizable: false
blocked_by: ["8.0"]
---

<task_context>
<domain>frontend/design</domain>
<type>implementation</type>
<scope>configuration</scope>
<complexity>medium</complexity>
<dependencies></dependencies>
<unblocks>"10.0, 11.0"</unblocks>
</task_context>

# Tarefa 9.0: Design System — Global CSS e Integração com DESIGN.md

## Relacionada às User Stories

- Suporte a todas as HUs — identidade visual do sistema

## Visão Geral

O `DESIGN.md` já foi criado na raiz do frontend com o design system "Circuit Core Dark" completo (tokens, tipografia, cores, princípios visuais, componentes). Esta task implementa o `global.css` com os tokens documentados no DESIGN.md e configura os fonts no `index.html`.

## Stitch Reference

O design visual foi criado no Stitch e deve ser consultado para referência pixel-perfect:

- **Projeto:** mcad (ID: `533156784329699726`)
- **Design System:** Circuit Core Dark (Asset: `b2bc911ef6b644fdac02168609989b83`)
- **Screen:** Associações - Listagem Clean (ID: `28d9d5dde6be44c0b3b307bb311051c0`)

Para obter imagens e código da screen de referência, usar `curl -L` nos URLs hospedados do Stitch.

## Requisitos

- `global.css` implementando TODOS os tokens do `DESIGN.md` como CSS variables
- Google Fonts: DM Sans, IBM Plex Sans, JetBrains Mono
- CSS reset mínimo
- Dark theme como padrão
- Regra "No-Line" — sem bordas 1px sólidas para separação; usar contraste de superfícies

## Arquivos Envolvidos

- **Criar:**
  - `frontend/src/global.css`
- **Modificar:**
  - `frontend/index.html` (adicionar Google Fonts preconnect/link)
- **Referência (não alterar):**
  - `frontend/DESIGN.md` — **fonte de verdade para tokens, cores, tipografia e princípios visuais**
  - Stitch screen `28d9d5dde6be44c0b3b307bb311051c0` — referência visual pixel-perfect
- **Skills para consultar:**
  - `frontend-design` — direção estética, tipografia, cores

## Subtarefas

- [ ] 9.1 Criar `global.css` com TODOS os CSS variables definidos no `DESIGN.md` (seções 2, 3, 4, 5, 6)
- [ ] 9.2 Implementar CSS reset mínimo e estilos base (body, scrollbar, anti-aliasing)
- [ ] 9.3 Adicionar Google Fonts no `index.html` (preconnect + link conforme DESIGN.md seção 9)
- [ ] 9.4 Verificar: `npm run build`

## Sequenciamento

- Bloqueado por: 8.0
- Desbloqueia: 10.0, 11.0
- Paralelizável: Não

## Detalhes de Implementação

### Fonte de verdade: `frontend/DESIGN.md`

Todos os tokens devem ser copiados fielmente do DESIGN.md. As seções relevantes são:

- **Seção 2 — Cores:** Superfícies (6 níveis), texto (3 níveis), acento (5 variantes), bordas, status, secundário
- **Seção 3 — Tipografia:** Fontes (display, body, mono), escala tipográfica
- **Seção 4 — Espaçamento:** 8 valores (space-1 a space-16)
- **Seção 5 — Bordas e Raios:** 3 valores (sm, md, lg)
- **Seção 6 — Elevação:** Sombras (sm, md, blue), transições (fast, base)

### Google Fonts (do DESIGN.md seção 9)

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=IBM+Plex+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

### Global CSS (reset + base)

```css
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
}

body {
  font-family: var(--font-body);
  background-color: var(--color-bg-floor);
  color: var(--color-text-primary);
  line-height: 1.5;
}

/* Scrollbar estilizada para dark theme */
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: var(--color-bg-primary); }
::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 4px; }
```

### Princípios do DESIGN.md a respeitar

1. Dark-first
2. Hierarquia por superfície (5 níveis)
3. Regra "No-Line" — sem bordas 1px sólidas para separação de seções
4. Tipografia com caráter (DM Sans headings, IBM Plex Sans body, JetBrains Mono dados)
5. Acento azul contido
6. Tabelas como cidadão de primeira classe
7. Sem branco puro — texto máximo `#e2e2eb`

## Critérios de Sucesso (Verificáveis)

- [ ] `npm run build` compila sem erros
- [ ] `global.css` declara TODAS as CSS variables listadas no DESIGN.md (superfícies, texto, acento, bordas, status, secundário, tipografia, espaçamento, raios, sombras, transições)
- [ ] Fontes carregam ao acessar `localhost:5173` (DM Sans, IBM Plex Sans, JetBrains Mono)
- [ ] Background do body é `--color-bg-floor` (#0c0e14)
- [ ] Nenhum valor de cor hardcoded no global.css (tudo via variables)
