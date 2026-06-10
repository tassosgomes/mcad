# QA Report — qa_task_02: Suspender Licença

**Task ID:** qa_task_02
**User Story:** HU-02 — Suspender licença ATIVA (RF-07)
**Date:** 2026-06-09
**Tester:** QA Task Runner
**Overall Status:** FAIL

---

## Summary

| Test Case | Description | Status |
|-----------|-------------|--------|
| CT-01 | Suspend an ATIVA license | PASS |
| CT-02 | Try to suspend an already SUSPENSA license | PASS |
| CT-03 | Try to suspend with short justificativa (< 10 chars) | PASS |
| CT-04 | Try to suspend an ENCERRADA license | FAIL |
| CT-05 | Frontend — Suspend button visible for ATIVA license | PASS |
| CT-06 | Frontend — Suspend via modal | PASS |

---

## CT-01: Suspend an ATIVA license

**Expected:**
- HTTP 200 after POST /suspender
- Response status = "SUSPENSA"
- History entry with statusAnterior="ATIVA", statusNovo="SUSPENSA", justificativa matching request

**Actual:**
- HTTP 200
- Response status = "SUSPENSA"
- History entry: `{"statusAnterior":"ATIVA","statusNovo":"SUSPENSA","justificativa":"Pendência financeira identificada — aguardando regularização","autor":"Analista Arrecadacao (analista_arrecadacao)","data":"2026-06-09T13:36:59.850493Z"}`

**Result:** PASS

---

## CT-02: Try to suspend an already SUSPENSA license

**Expected:**
- HTTP 422
- Detail contains exactly or includes: "Somente licenças ATIVAS podem ser suspensas"

**Actual:**
- HTTP 422
- Detail: "Somente licenças ATIVAS podem ser suspensas"

**Result:** PASS

**Note:** The PRD specifies the detail should include the current status: "Somente licenças ATIVAS podem ser suspensas. Status atual: SUSPENSA". The actual response omits "Status atual: SUSPENSA". However, this test case's assertion was written to accept the partial message, so it passes per the test case definition.

---

## CT-03: Try to suspend with short justificativa (< 10 chars)

**Expected:**
- HTTP 400 or 422 (validation error for min length)

**Actual:**
- HTTP 400
- Detail: "Invalid request content."

**Result:** PASS

---

## CT-04: Try to suspend an ENCERRADA license

**Expected:**
- HTTP 422
- Detail contains message about ENCERRADA

**Actual:**
- HTTP 422
- Detail: "Somente licenças ATIVAS podem ser suspensas"

**Result:** FAIL

**Failure Details:**
The API returns a generic error message "Somente licenças ATIVAS podem ser suspensas" without indicating the current status (ENCERRADA). According to the PRD, the 422 error response should include the current status, e.g., "Somente licenças ATIVAS podem ser suspensas. Status atual: SUSPENSA" (as shown in the PRD example). The actual response for the ENCERRADA license does not mention "ENCERRADA" anywhere in the error detail.

**Deviation from PRD:**
- PRD Expected: `{"detail": "Somente licenças ATIVAS podem ser suspensas. Status atual: {currentStatus}"}`
- Actual: `{"detail": "Somente licenças ATIVAS podem ser suspensas"}`

---

## CT-05: Frontend — Suspend button visible for ATIVA license

**Expected:**
- "Suspender" button is visible on ATIVA license detail page

**Actual:**
- Button "Suspender" is visible in the "Ações" section

**Result:** PASS

**Evidence:** `screenshots/ct05_suspend_button.png`

---

## CT-06: Frontend — Suspend via modal

**Expected:**
- Modal opens with textarea for justificativa
- After filling and submitting, license status changes to "Suspensa"

**Actual:**
- Modal "Suspender Licença" opened with textarea (placeholder: "Descreva o motivo da ação (mín. 10 caracteres)...")
- Filled: "Pendência financeira identificada no contrato"
- Submit button enabled after 45 characters entered
- After submission, status changed to "Suspensa"
- History shows new entry with justificativa and author "Analista Arrecadacao (analista_arrecadacao)"

**Result:** PASS

**Evidence:** `screenshots/ct06_suspended.png`

---

## Evidence Files

| File | Description |
|------|-------------|
| `screenshots/ct05_suspend_button.png` | CT-05 — Suspend button visible on ATIVA license detail |
| `screenshots/ct06_suspended.png` | CT-06 — License status after suspension via modal |
| `requests.log` | API request/response log for all CTs |

---

## Conclusion

The suspension functionality works correctly for the happy path (ATIVA → SUSPENSA) and correctly rejects invalid status transitions (SUSPENSA, ENCERRADA) with HTTP 422. However, the error message detail does not include the current status as specified in the PRD (e.g., "Status atual: ENCERRADA"), which causes CT-04 to fail.

The frontend correctly displays the "Suspender" button for ATIVA licenses, opens the modal with validation, and updates the status after successful suspension.

**Recommendation:** Update the API error message for invalid status transitions to include the current status, matching the PRD specification: `{"detail": "Somente licenças ATIVAS podem ser suspensas. Status atual: {statusAtual}"}`.

---
**END OF REPORT**
