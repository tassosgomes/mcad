---
target: Cadastro pages (Associações, Titulares, Obras, Fonogramas)
total_score: 26
p0_count: 0
p1_count: 3
timestamp: 2026-06-07T14-11-16Z
slug: dastro-pages-associa-es-titulares-obras-fonogramas
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Loading/error states consistent; disabled action buttons lack tooltip explaining why |
| 2 | Match System / Real World | 4 | ECAD domain language used faithfully throughout |
| 3 | User Control and Freedom | 3 | Delete modals, pagination, sort reversal present; Obras/Titulares filters lack explicit "clear" |
| 4 | Consistency and Standards | 2 | Three distinct visual patterns for architecturally identical list-page templates |
| 5 | Error Prevention | 3 | Confirmação de exclusão, botões desabilitados para estados protegidos |
| 6 | Recognition Rather Than Recall | 3 | Column labels, sort icons correct; FonogramasFilters inputs missing aria-label |
| 7 | Flexibility and Efficiency | 2 | Debounce inconsistency (300ms vs 400ms); no keyboard shortcuts |
| 8 | Aesthetic and Minimalist Design | 2 | Inconsistency creates visual noise; FonogramasTable renders invisible sort icons (undefined token) |
| 9 | Error Recovery | 3 | Retry buttons, toast descriptions accurate |
| 10 | Help and Documentation | 1 | Empty states have no guidance; no contextual help |
| Total | | 26/40 | Acceptable |

## Anti-Patterns Verdict

4 side-tab findings from detector: DeleteTitularModal, DepuracaoBanner, ObraForm, FonogramaDepuracaoBanner.

## Priority Issues

P1: Three table styling patterns — different border strategies, background levels, spacing scales.
P1: AssociacoesPage double padding — shell (2.5rem×2rem) + page (.page padding) stacks.
P1: FonogramasTable 3 undefined tokens: --color-bg-surface-hover, --color-primary, --color-bg-base.
P2: FonogramasFilters: No-Line border violation + raw values + undefined tokens.
P2: TitularesTable border-radius-xl vs ObrasTable border-radius-lg inconsistency.
