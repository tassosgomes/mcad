---
target: src/domains/auditoria (resolved to frontend/src/features/auditoria)
total_score: 30
p0_count: 2
p1_count: 2
timestamp: 2026-06-06T23-39-57Z
slug: frontend-src-features-auditoria
---
# Critique: frontend/src/features/auditoria

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Centered `<Loading />` spinner on tables instead of skeletons; report-status panel itself is excellent |
| 2 | Match System / Real World | 4 | Domain language exemplary: Bronze/Prata/Ouro, "Quem / De onde (tela) / Entidade afetada", "Snapshot Ouro restrito" |
| 3 | User Control and Freedom | 3 | "Limpar" everywhere and modal Esc, but no pagination back/forward and no in-page back-to-list |
| 4 | Consistency and Standards | 3 | Strong token discipline; one minor dashboard divergence; side-tab anti-pattern reused four times, consistent but consistently wrong |
| 5 | Error Prevention | 3 | Date validation, smart 7-day default, optional filters submit on click, no destructive ops in scope |
| 6 | Recognition Rather Than Recall | 3 | All filters visible, autocomplete + catalog; missing sub-nav between auditoria sub-pages |
| 7 | Flexibility and Efficiency | 2 | No keyboard shortcuts, no pagination, only current-page CSV export; power user stalls at row 21 |
| 8 | Aesthetic and Minimalist Design | 3 | Tight surface hierarchy honored; 4 side-stripe violations break the "No-Line" rule from DESIGN.md |
| 9 | Error Recovery | 3 | Plain copy, no retry buttons; the 403 "Snapshot Ouro restrito" copy is exemplary |
| 10 | Help and Documentation | 3 | Dashboard FAQ is genuinely useful; collapsible "Detalhes tecnicos para suporte" is brilliant; no global help search |
| **Total** | | **30/40** | **Good, solid foundation; address the four issues below** |

## Anti-Patterns Verdict

LLM assessment: does not read as AI-slop at first glance; PT-BR regulamento language and Bronze/Prata/Ouro classification carry domain investment. Danger zone is the dashboard: four icon+title+description+arrow cards just on this side of "identical card grids".

Deterministic scan: 2 `side-tab` warnings.
- `components/AuditEventDetailPanel.module.css:21` -> `.snapshotDenied`
- `pages/AuditPage.module.css:205` -> `.errorState` (imported by 4 content pages)

LLM caught additionally (detector missed the `border-left-color` shorthand split):
- `AuditEventDetailPanel.module.css:152` -> `.valueBefore` (3px red stripe on diff chip)
- `AuditEventDetailPanel.module.css:156` -> `.valueAfter` (3px green stripe on diff chip)

Four side-tab uses total, and the diff stripes encode before vs. after by color alone (textual labels live in a separate row).

## Overall Impression

Clear care for what auditing actually is: investigation, not dashboard porn. Detail-panel narrative + progressive disclosure is the best single piece. Biggest opportunity is consequential, not cosmetic: the diff visualization on AuditEventDetailPanel violates both the absolute side-stripe ban and the "no meaning by color alone" accessibility rule. Fix that first; everything else is solid-to-polish.

## What's Working

1. Domain language fidelity. "Quem / De onde (tela) / Entidade afetada / Servico de origem / Rota consultada / Nivel" reads like a regulamento section. "Snapshot somente para usuarios com permissao forte de auditoria" instead of "Restricted access" is the same principle in action.
2. Investigation-shaped empty states. Zero states teach the right starting move; dashboard FAQ preempts the actual first questions an auditor asks. Hospitality without patronizing.
3. The detail-panel pattern. Narrative at top, grid of Quem/De onde/Entidade/Nivel, optional snapshot section, diff section, collapsible "Detalhes tecnicos para suporte", nested details for full JSON. Genuinely how a compliance officer wants information layered.

## Priority Issues

- [P0] Side-stripe borders break the absolute ban, and the diff variant encodes before/after by color alone. `border-left: 3px solid <red>` on `.errorState`, `.snapshotDenied`, `.valueBefore`, `.valueAfter`. DESIGN.md's own "No-Line" rule rejects this. For diff chips, the only visual signal of before vs. after is red vs. green at the left edge.
  - Why it matters: single most cited AI-UI tell in impeccable's spec; DESIGN.md committed to a fuller solution. Failing your own rule undermines the architectural-reference role.
  - Fix: drop `border-left` on `.errorState` and `.snapshotDenied`; replace with `background: rgba(239, 68, 68, 0.08)` plus existing surface. For diff chips: full background tint (`rgba(239, 68, 68, 0.10)` / `rgba(34, 197, 94, 0.10)`) AND a leading minus/plus glyph or icon.
  - Suggested command: `/impeccable polish`

- [P0] Zero `prefers-reduced-motion` coverage anywhere in `src/`. PRODUCT.md commits to WCAG 2.1 AA. Dashboard actionCard does `transform: translateY(-1px)` on hover; row hover transitions, modal animations, status badge: none have a reduced-motion alternative. Persona Sam is locked out of the contract.
  - Why it matters: one-block CSS fix in `global.css` earns WCAG AA for the entire app.
  - Fix: append global rule in `frontend/src/global.css` zeroing transitions and animations under `prefers-reduced-motion: reduce`; audit the `transform: translateY` hovers.
  - Suggested command: `/impeccable harden`

- [P1] No pagination on Timeline / ScreenAccess / Catalog, while `shared/components/ui/pagination/` already exists. Current escape hatch is "20+ resultados (refine o periodo)". For an auditor investigating a 30-day window for a single user, "refine the period" is the wrong answer. Worse: a finished pagination component sits unused.
  - Why it matters: persona Alex hits this on first real investigation. CSV export covers current page only. "Lost rows" is a credibility hit for an audit tool.
  - Fix: wire `<Pagination>` into `useAuditEvents` / `useScreenAccess` / `useAuditCatalog`. Hooks already accept `page` and `size`. CSV should walk all pages.
  - Suggested command: `/impeccable layout src/features/auditoria/pages`

- [P1] Loading uses centered `<Loading />` spinner on tables, not skeletons. Product guidance explicit: skeletons, not spinners in content. Effect: column headers disappear, spinner pops in, table jolts back. Layout shifts on every query.
  - Why it matters: power user reads column headers while waiting; spinner steals that affordance. Skeletons make slow BFF queries feel ~30% faster.
  - Fix: build `shared/components/ui/table/TableSkeleton.tsx`; use it across the four table-bearing pages. Card-shaped skeleton variant for catalog.
  - Suggested command: `/impeccable polish`

- [P2] AuditCatalogPage uses a 2-column card grid for what is fundamentally a reference table. With 20+ entries it becomes a wall of identical cards. Card affordance promises "compare these few items"; underlying job is "scan, search, open one."
  - Why it matters: scanning the catalog is the auditor's first move when triaging an event. Cards force eye saccades; a table doesn't.
  - Fix: render as system table (Dominio | Tela | Nivel badge | ID | Retencao | Aliases) with row-click opening a detail panel/modal. Keep one card layout but only for the selected item.
  - Suggested command: `/impeccable layout src/features/auditoria/pages/AuditCatalogPage.tsx`

## Persona Red Flags

Alex (Power-User Analyst), primary product persona:
- No keyboard nav between sub-pages.
- 20-row hard cap, no pagination; CSV exports current page only.
- "Buscar eventos" fires only on click; no Enter-from-anywhere shortcut.
- Spinner hides table headers Alex was reading.
- Action cards lift by 1px, too subtle to register as affordance.

Sam (Accessibility-Dependent), explicit PRODUCT.md WCAG 2.1 AA target:
- Zero `prefers-reduced-motion` honoring.
- Diff before/after distinguished by 3px-stripe color alone; "Antes"/"Depois" labels live in a separate row.
- `.input:focus` is `box-shadow: 0 0 0 1px var(--color-accent)`; 1px focus ring on `--color-bg-floor` is hard to see (AA recommends 2-3px).
- 'warning' variant for Ouro overlaps the same yellow used for warnings; semantic confusion risk.

Riley (Stress Tester):
- `JSON.parse(raw) as ReportHistoryEntry[]` in `AuditReportsPage:52`; type-cast without runtime guard. Corrupted localStorage crashes "Ultimos relatorios" render silently.
- No URL state preservation for filters; Cmd-R loses an in-progress investigation.

## Minor Observations

- Dashboard 4 action cards risk reading as Generic Admin Landing; vary one (e.g., span 2 columns or embed a 1-line "12 eventos GOLD nas ultimas 24h" tease).
- `aria-label="Acoes"` on `<th>` plus `<span class={visuallyHidden}>Acoes</span>` inside is double-labeled.
- `.statusBadge` uses `border-radius: 999px` (DESIGN.md authorizes pill for status chips, OK).
- `actionCard:hover { transform: translateY(-1px) }` is below perceptual threshold; commit to 2-3px or drop.
- "20+ resultados (refine o periodo...)" honest but remove parenthetical once pagination ships.
- `<details>Detalhes tecnicos para suporte</details>` summary uses `cursor: pointer` but no visible disclosure triangle; add a `>` glyph or `<ChevronRight>` icon.

## Questions to Consider

- What would the dashboard look like if it showed the day's audit state ("47 eventos hoje, 3 GOLD, 1 relatorio falhou") instead of being purely navigational?
- If diff chips drop colored stripes, what does additive/subtractive direction look like? Prefixed `-`/`+`? Sectioned columns? Strikethrough on old value?
- Should the catalog be a table (scan affordance) and the dashboard's "action cards" be the lighter list (since they're nav, not destination)? Right now both surfaces use the same card affordance for different jobs.
