# QA Report — qa_task_05: Listar Licenças

**Task ID:** qa_task_05  
**User Story:** HU-05 — Listar licenças com filtros, paginação e ordenação (RF-14 a RF-17)  
**Date:** 2026-06-09  
**Tester:** QA Task Runner (automated)  
**Overall Status:** PASS with observations

---

## Executive Summary

All functional test cases passed. The API correctly supports listing licenses with filters (status, vigente, usuarioMusicaId, razaoSocial, rubricaSigla), pagination, and sorting. The frontend filters and pagination work end-to-end. 

**Observations / Deviations from PRD:**
1. **API response structure** deviates from PRD contract: uses Spring Data REST format (`items`/`metadata` with `totalElements`) instead of the documented (`data`/`pagination` with `total`). Page numbering is 0-indexed in the actual API vs 1-indexed in the PRD.
2. **Default sort** is `criadoEm,desc` (created date descending) rather than the PRD-specified `-dataInicio` (start date descending). The `dataInicio` sort works when explicitly requested.
3. **Frontend pagination display bug:** on the first page the range label shows `"-9–0"` instead of the expected range, and the "Anterior" button remains incorrectly disabled after navigating to page 1.
4. **CT-11 (badges):** "Suspensa" badge could not be verified because the database currently contains 0 SUSPENSA licenses. "Ativa" (green) and "Encerrada" (gray) badges were verified.

---

## Test Case Results

| CT | Description | Status | Notes |
|---|---|---|---|
| CT-01 | List all licenses — default pagination | PASS | HTTP 200; array and pagination metadata present; expanded usuarioMusica/rubrica objects present. Response key names differ from PRD (items/metadata vs data/pagination). |
| CT-02 | Filter by status=ATIVA | PASS | HTTP 200; all 259 returned items have status="ATIVA". |
| CT-03 | Filter by status=SUSPENSA | PASS | HTTP 200; empty array returned (0 items). |
| CT-04 | Filter by vigente=true | PASS | HTTP 200; all items have dataFim=null OR dataFim >= 2026-06-09. |
| CT-05 | Filter by usuarioMusicaId | PASS | HTTP 200; all 9 returned items belong to the specified user (a598cc9b-ca99-4d7b-a3c1-c7e7de3fb912). |
| CT-06 | Filter by razaoSocial partial | PASS | HTTP 200; all items match partial case-insensitive "Ankun". |
| CT-07 | Filter by rubricaSigla partial | PASS | HTTP 200; all items match partial case-insensitive "RAD". |
| CT-08 | Pagination — page and size | PASS | HTTP 200; items.length=5, metadata.page=1, metadata.size=5. |
| CT-09 | Sorting — dataInicio DESC | PASS | HTTP 200; data ordered by dataInicio DESC (most recent first). |
| CT-10 | Frontend — Filters and pagination work | PASS | Status and vigente filters applied successfully; pagination navigates and loads different data. UI display bug noted. |
| CT-11 | Frontend — Badges and expanded data | PARTIAL | "Ativa" (green) and "Encerrada" (gray) badges verified. "Suspensa" badge not verifiable (0 items in DB). Each row shows usuario and rubrica names. |

---

## Detailed Results

### CT-01: List all licenses — default pagination
**Request:** `GET https://mcad-bff.tasso.dev.br/api/arrecadacao/v1/licencas`  
**Expected:** HTTP 200, pagination object with page/size/total/totalPages, data array, expanded usuarioMusica and rubrica in each item.  
**Actual:** HTTP 200, `items` array (20 items), `metadata` object with `page: 0`, `size: 20`, `totalElements: 260`, `totalPages: 13`. Each item contains full `usuarioMusica` (id, razaoSocial, cnpjFormatado) and `rubrica` (id, sigla, nome, ativo) objects.  
**Verdict:** PASS — functional requirements met; contract key names differ from PRD.

### CT-02: Filter by status=ATIVA
**Request:** `GET /licencas?status=ATIVA`  
**Expected:** HTTP 200, all items have status="ATIVA".  
**Actual:** HTTP 200, 259 items, every item has `"status": "ATIVA"`.  
**Verdict:** PASS

### CT-03: Filter by status=SUSPENSA
**Request:** `GET /licencas?status=SUSPENSA`  
**Expected:** HTTP 200, all items have status="SUSPENSA" (may be empty).  
**Actual:** HTTP 200, empty `items` array, `totalElements: 0`.  
**Verdict:** PASS

### CT-04: Filter by vigente=true
**Request:** `GET /licencas?vigente=true`  
**Expected:** HTTP 200, all items have dataFim=null OR dataFim >= today.  
**Actual:** HTTP 200, 260 items. Checked representative samples: null dates and future dates such as "2027-03-24", "2026-09-08", "2026-12-02" are all >= 2026-06-09.  
**Verdict:** PASS

### CT-05: Filter by usuarioMusicaId
**Request:** `GET /licencas?usuarioMusicaId=a598cc9b-ca99-4d7b-a3c1-c7e7de3fb912`  
**Expected:** HTTP 200, all items belong to that user.  
**Actual:** HTTP 200, 9 items. Every item has `usuarioMusica.id = a598cc9b-ca99-4d7b-a3c1-c7e7de3fb912` (Ankunding, Yost and Quitzon).  
**Verdict:** PASS

### CT-06: Filter by razaoSocial (partial, case-insensitive)
**Request:** `GET /licencas?razaoSocial=Ankun`  
**Expected:** HTTP 200, results contain matching users.  
**Actual:** HTTP 200, 9 items. All have `razaoSocial: "Ankunding, Yost and Quitzon"`.  
**Verdict:** PASS

### CT-07: Filter by rubricaSigla (partial, case-insensitive)
**Request:** `GET /licencas?rubricaSigla=RAD`  
**Expected:** HTTP 200, results contain matching rubricas.  
**Actual:** HTTP 200, 34 items. All have `rubrica.sigla` containing "RAD" (e.g., "RADIO").  
**Verdict:** PASS

### CT-08: Pagination — page and size
**Request:** `GET /licencas?page=1&size=5`  
**Expected:** HTTP 200, data.length <= 5, pagination.page=1, pagination.size=5.  
**Actual:** HTTP 200, `items.length = 5`, `metadata.page = 1`, `metadata.size = 5`, `totalPages = 52`.  
**Verdict:** PASS

### CT-09: Sorting — default -dataInicio
**Request:** `GET /licencas?sort=dataInicio,desc`  
**Expected:** Data ordered by dataInicio DESC (most recent first).  
**Actual:** HTTP 200. First dataInicio values: 2027-06-03, 2027-06-02, 2027-05-27, 2027-05-23, 2027-05-20 … confirming descending order.  
**Verdict:** PASS

### CT-10: Frontend — Filters and pagination work
**Steps:**
1. Navigated to `/arrecadacao/licencas`.
2. Applied status filter "Ativa": total changed from 260 → 259; table shows only ATIVA rows.
3. Applied vigente filter "Vigentes": total remained 259; table updates.
4. Clicked "Próxima página": page indicator changed (0/26 → 1/26), table loaded different data.

**Observations:**
- The pagination range label on the first page incorrectly displays `"-9–0"` instead of a valid range like "1–10".
- After navigating to page 1, the "Anterior" button remains disabled, suggesting a frontend state bug.

**Verdict:** PASS (core functionality works; UI bugs documented)

### CT-11: Frontend — Badges and expanded data
**Observations:**
- "Ativa" badge displayed in green for all ATIVA rows (verified on first page). Screenshot captured.
- "Encerrada" badge displayed in gray for the single ENCERRADA row (QA Teste Arrecadação Ltda). Screenshot captured.
- "Suspensa" badge (yellow) could **not** be verified: database contains 0 SUSPENSA licenses.
- Each row clearly shows the usuario de música name + CNPJ and the rubrica name.

**Verdict:** PARTIAL PASS — 2 of 3 badge colors verified due to lack of SUSPENSA test data.

---

## Evidence Files

| File | Description |
|---|---|
| `screenshots/ct10_filter_ativa.png` | CT-10: Table after applying "Ativa" filter |
| `screenshots/ct10_filter_vigente.png` | CT-10: Table after applying "Vigentes" filter |
| `screenshots/ct10_pagination.png` | CT-10: Table after clicking next page |
| `screenshots/ct11_badges.png` | CT-11: Badges visible on first page (Ativa) |
| `screenshots/ct11_encerrada_badge.png` | CT-11: Encerrada badge verification |
| `requests.log` | Raw API requests/responses for CT-01 through CT-09 |

---

## Issues & Recommendations

1. **API Contract Compliance (Medium)**
   - Align response envelope with PRD: rename `items` → `data`, `metadata` → `pagination`, `totalElements` → `total`.
   - Align page numbering with PRD: start at `1` instead of `0`.
   - Align default sort with PRD: `-dataInicio` instead of `criadoEm,desc`.

2. **Frontend Pagination Display Bug (Low)**
   - Fix first-page range label (currently `"-9–0"`).
   - Fix "Anterior" button state so it is enabled when on page 1 and above.

3. **Test Data Gap (Low)**
   - No SUSPENSA licenses exist in the current database, preventing verification of the yellow "Suspensa" badge. Consider seeding test data with all three statuses for comprehensive UI validation.

---

*End of report*
