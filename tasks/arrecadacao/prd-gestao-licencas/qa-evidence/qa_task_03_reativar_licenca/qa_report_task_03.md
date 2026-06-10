# QA Report — qa_task_03: Reativar Licença

**Task ID:** qa_task_03
**User Story:** HU-03 — Reativar licença SUSPENSA (RF-08, RF-13)
**Date:** 2026-06-09
**Status:** PASS

---

## Summary

| Case | ID | Type | Description | Status |
|------|----|------|-------------|--------|
| CT-01 | API | Reactivate a SUSPENSA license | POST /reativar → 200, status ATIVA + history entry | PASS |
| CT-02 | API | Try to reactivate an already ATIVA license | POST /reativar → 422, detail about SUSPENSA requirement | PASS |
| CT-03 | API | Try to reactivate an ENCERRADA license | POST /reativar → 422, detail about ENCERRADA status | PASS |
| CT-04 | UI | Reativar button visible for SUSPENSA license | Detail page shows "Reativar" button | PASS |
| CT-05 | UI | Reactivate via modal | Modal opens, submit justificativa, status changes to Ativa | PASS |

---

## CT-01 — Reactivate a SUSPENSA license

**Expected:**
- POST /api/arrecadacao/v1/licencas/{id}/reativar returns HTTP 200
- Response body contains `status: "ATIVA"`
- GET /historico-status returns a new entry with `statusAnterior: "SUSPENSA"`, `statusNovo: "ATIVA"`, and `justificativa` matching the request

**Actual:**
- POST returned 200 with body containing `status: "ATIVA"`
- GET /historico-status returned 200 with history array. First element:
  - `statusAnterior`: "SUSPENSA"
  - `statusNovo`: "ATIVA"
  - `justificativa`: "Pendência financeira regularizada — licença reativada"
  - `autor`: "Analista Arrecadacao (analista_arrecadacao)"

**Result:** PASS

---

## CT-02 — Try to reactivate an already ATIVA license

**Expected:**
- POST /api/arrecadacao/v1/licencas/{id}/reativar returns HTTP 422
- Response `detail` contains message about only SUSPENSA licenses being reactivatable

**Actual:**
- POST returned 422
- Response body:
  ```json
  {
    "type": "about:blank",
    "title": "Unprocessable Entity",
    "status": 422,
    "detail": "Licenca nao pode ser reativada pois nao esta SUSPENSA. Status atual: ATIVA",
    "instance": "/api/v1/licencas/8b961734-3d53-4c3d-98c4-5dc3fc550d65/reativar"
  }
  ```

**Result:** PASS

---

## CT-03 — Try to reactivate an ENCERRADA license

**Expected:**
- POST /api/arrecadacao/v1/licencas/{id}/reativar returns HTTP 422
- Response `detail` contains message about ENCERRADA

**Actual:**
- POST returned 422
- Response body:
  ```json
  {
    "type": "about:blank",
    "title": "Unprocessable Entity",
    "status": 422,
    "detail": "Licenca nao pode ser reativada pois nao esta SUSPENSA. Status atual: ENCERRADA",
    "instance": "/api/v1/licencas/c58f93dd-fa2f-48fa-85e8-b8657b915eae/reativar"
  }
  ```

**Result:** PASS

---

## CT-04 — Frontend: Reativar button visible for SUSPENSA license

**Expected:**
- Navigate to a SUSPENSA license detail page
- Assert "Reativar" button is visible

**Actual:**
- Navigated to /arrecadacao/licencas/62a60432-7981-4a87-a0f4-74d8fd64f6a3
- Page shows Status: Suspensa
- "Reativar" button is visible in the "Ações" section

**Result:** PASS

**Evidence:** `screenshots/ct04_reativar_button.png`

---

## CT-05 — Frontend: Reactivate via modal

**Expected:**
- Click "Reativar" button → modal opens with textarea for justificativa
- Fill justificativa: "Pendência financeira regularizada no contrato"
- Submit → license status changes to "Ativa" (green badge)

**Actual:**
- Clicked "Reativar" → modal "Reativar Licença" opened with textarea
- Filled justificativa: "Pendência financeira regularizada no contrato"
- Clicked "Reativar" in modal
- Page updated: Status changed from "Suspensa" to "Ativa"
- Actions section changed to show only "Suspender" button
- History section shows new entry: SUSPENSA → ATIVA with the filled justificativa

**Result:** PASS

**Evidence:** `screenshots/ct05_reativada.png`

---

## Evidence Files

- `screenshots/ct04_reativar_button.png` — SUSPENSA license detail page showing "Reativar" button
- `screenshots/ct05_reativada.png` — License detail page after successful reactivation showing "Ativa" status
- `requests.log` — API request/response log for CT-01, CT-02, CT-03

---

## Notes

- All API calls were executed via Playwright `page.evaluate` with `fetch` to avoid BFF anti-bot/curl 401 issues.
- The token used for API calls was extracted from the active browser session.
- License IDs used:
  - CT-01: `8b961734-3d53-4c3d-98c4-5dc3fc550d65` (SUSPENSA → reactivated)
  - CT-03: `c58f93dd-fa2f-48fa-85e8-b8657b915eae` (ENCERRADA)
  - CT-04/05: `62a60432-7981-4a87-a0f4-74d8fd64f6a3` (SUSPENSA → reactivated via UI)
