# QA Retest Report — qa_task_05: Listar Licenças

**Date:** 2026-06-09
**Environment:** https://mcad.tasso.dev.br
**Test Runner:** QA Task Runner (Retest)
**Evidence Directory:** `/home/tsgomes/mcad/tasks/arrecadacao/prd-gestao-licencas/qa-evidence/qa_task_05_listar_licencas/`

---

## CT-01: API Response Structure

**Previous Observation:** Response used `items`/`metadata`/`totalElements` with 0-indexed pages instead of PRD's `data`/`pagination`/`total` with 1-indexed pages.

**Retest Method:**
- Intercepted the actual API call made by the frontend via browser network monitoring.
- Endpoint: `GET https://mcad-bff.tasso.dev.br/api/arrecadacao/v1/licencas?page=0&size=10&sort=criadoEm%2Cdesc`

**Result:**
```json
{
  "items": [...],
  "metadata": {
    "page": 0,
    "size": 10,
    "totalElements": 260,
    "totalPages": 26
  }
}
```

**Verdict:** ❌ **FAIL**

- **Expected:** Response envelope with `data` array, `pagination` object containing `total`, and 1-indexed page numbers.
- **Actual:** Response still uses `items` array, `metadata` object with `totalElements`, and 0-indexed page numbers (`page: 0`).
- **Evidence:** `api_responses.json` — the API contract was **not updated** since the previous run.

---

## CT-09: Default Sort Order

**Previous Observation:** Default sort was `criadoEm,desc` instead of PRD's `-dataInicio` (dataInicio DESC).

**Retest Method:**
- Observed the default API request issued by the frontend when navigating to `/arrecadacao/licencas`.
- Endpoint: `GET /api/arrecadacao/v1/licencas?page=0&size=10&sort=criadoEm%2Cdesc`
- Verified the rendered list order against `dataInicio` values.

**Result:**
- Frontend explicitly sends `sort=criadoEm,desc`.
- Rendered list order:
  1. Ankunding, Yost and Quitzon — 09/06/2026
  2. Ankunding, Yost and Quitzon — 09/06/2026
  3. Ankunding, Yost and Quitzon — 09/06/2026
  4. Bins, McClure and Jast — 08/06/2026
  5. Frami LLC — 20/06/2026
  6. Feil - Paucek — 02/09/2026
  7. Donnelly - Reynolds — 27/08/2026
  8. Gorczany - Welch — 04/11/2026

If sorted by `dataInicio DESC`, the expected order should be:
  1. Gorczany - Welch — 04/11/2026
  2. Feil - Paucek — 02/09/2026
  3. Donnelly - Reynolds — 27/08/2026
  ...

**Verdict:** ❌ **FAIL**

- **Expected:** Default sort by `dataInicio` descending (most recent start date first).
- **Actual:** Default sort is still `criadoEm,desc` (most recently created first). The list is not ordered by `dataInicio`.
- **Evidence:** `api_responses.json` (intercepted request shows `sort=criadoEm,desc`), `pagination_info.json` (rendered order).

---

## CT-10: Frontend Pagination Display Bug

**Previous Observation:** First page showed `"-9–0"` instead of valid range; "Anterior" button incorrectly disabled.

**Retest Method:**
- Navigated to `/arrecadacao/licencas`.
- Checked pagination range label and "Anterior" button state.
- Also checked the empty-state pagination (filtered SUSPENSA) for edge cases.

**Result:**
- **Unfiltered page (260 items):**
  - Range label: `Mostrando 1–10 de 260` ✅
  - "Anterior" button: `disabled = true` ✅ (correct for first page)
  - Page indicator: `1 / 26`

- **Empty filtered page (SUSPENSA, 0 items):**
  - Range label: `Mostrando 0–0 de 0` ✅
  - "Anterior" button: disabled ✅
  - "Próximo" button: disabled ✅
  - Page indicator: `1 / 0`

**Verdict:** ✅ **PASS**

- **Expected:** Range label shows valid non-negative numbers; "Anterior" button state is correct on first page.
- **Actual:** Range labels are correct (`1–10 de 260` and `0–0 de 0`). "Anterior" is correctly disabled on the first page. No negative numbers observed.
- **Evidence:** `screenshots/ct10_retest_pagination.png`, `pagination_info.json`.

---

## CT-11: Badge "Suspensa" (Yellow)

**Previous Observation:** Could not verify because no SUSPENSA licenses existed in the database.

**Retest Method:**
- Applied the "Suspensa" status filter in the UI.
- Checked API response for `status=SUSPENSA`.
- Verified whether any yellow badge is rendered.

**Result:**
- Filtered API call: `GET /api/arrecadacao/v1/licencas?status=SUSPENSA`
- API response: `{"items":[],"metadata":{"page":0,"size":10,"totalElements":0,"totalPages":0}}`
- UI result: `Nenhuma licença encontrada.` (empty state)
- No yellow "Suspensa" badge visible anywhere.

**Verdict:** ⚠️ **NOT TESTED**

- **Expected:** If SUSPENSA licenses exist, a yellow badge should be displayed.
- **Actual:** Zero SUSPENSA licenses exist in the database. The badge cannot be verified because there is no data to render it.
- **Evidence:** `screenshots/ct11_retest_badge_suspensa.png` (empty state), `api_responses.json` (zero items), `screenshots/ct11_retest_badge_suspensa_unfiltered.png` (no yellow badge in unfiltered list).

---

## Summary

| Case | Status | Issue |
|------|--------|-------|
| CT-01 | ❌ FAIL | API response envelope unchanged (`items`/`metadata`/`totalElements`, 0-indexed) |
| CT-09 | ❌ FAIL | Default sort still `criadoEm,desc` instead of `dataInicio,desc` |
| CT-10 | ✅ PASS | Pagination display bug fixed — valid ranges and correct button states |
| CT-11 | ⚠️ NOT TESTED | No SUSPENSA licenses exist; badge cannot be verified |

---

## Evidence Files

- `screenshots/ct10_retest_pagination.png` — Pagination on unfiltered list
- `screenshots/ct11_retest_badge_suspensa.png` — Empty state after SUSPENSA filter
- `screenshots/ct11_retest_badge_suspensa_unfiltered.png` — Unfiltered list showing no yellow badge
- `api_responses.json` — Intercepted API responses
- `pagination_info.json` — Extracted pagination DOM state
- `requests.log` — Full network request log
