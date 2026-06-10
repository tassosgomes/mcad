# QA Report — qa_task_02: Suspender Licença (RETEST)

**Task ID:** qa_task_02
**User Story:** HU-02 — Suspender licença ATIVA (RF-07)
**Date:** 2026-06-10
**Tester:** QA Task Runner
**Overall Status:** PASS

---

## Summary

| Test Case | Description | Status |
|-----------|-------------|--------|
| CT-01 | Suspend an ATIVA license | PASS |
| CT-02 | Try to suspend an already SUSPENSA license | PASS |
| CT-04 | Try to suspend an ENCERRADA license | PASS |
| CT-05 | Frontend — Suspend via modal | PASS |

---

## CT-01: Suspend an ATIVA license

**Expected:**
- HTTP 200 after POST /suspender
- Response status = "SUSPENSA"

**Actual:**
- HTTP 200
- Response status = "SUSPENSA"
- License ID: 01f8af48-672f-47d3-b376-16bdba0d1d94

**Result:** PASS

---

## CT-02: Try to suspend an already SUSPENSA license

**Expected:**
- HTTP 422
- Detail contains "Somente licenças ATIVAS podem ser suspensas"

**Actual:**
- HTTP 422
- Detail: "Somente licenças ATIVAS podem ser suspensas. Status atual: SUSPENSA"
- License ID: 01f8af48-672f-47d3-b376-16bdba0d1d94 (same as CT-01)

**Result:** PASS

**Note:** The error message now includes the current status as specified in the PRD.

---

## CT-04: Try to suspend an ENCERRADA license

**Expected:**
- HTTP 422
- Detail contains message about ENCERRADA status

**Actual:**
- HTTP 422
- Detail: "Somente licenças ATIVAS podem ser suspensas. Status atual: ENCERRADA"
- License ID: 78626f89-cb9b-4e79-abd9-d9b742769844

**Result:** PASS

**Note:** Previously failed because the error message did not include the current status. After the fix, the error message now correctly includes "Status atual: ENCERRADA".

---

## CT-05: Frontend — Suspend via modal

**Expected:**
- Modal opens with textarea for justificativa
- After filling and submitting, license status changes to "Suspensa"

**Actual:**
- Modal "Suspender Licença" opened with textarea (placeholder: "Descreva o motivo da ação (mín. 10 caracteres)...")
- Filled: "Pendência financeira identificada no contrato"
- Submit button enabled after 45 characters entered
- After submission, status changed to "Suspensa"
- History shows new entry with justificativa and author "Analista Arrecadacao (analista_arrecadacao)"
- Success notification: "Licença suspensa com sucesso"
- License ID: 5112f7c5-2899-4e89-837f-fdcd73c38609

**Result:** PASS

**Evidence:** `screenshots/ct05_retest_suspended.png`

---

## Evidence Files

| File | Description |
|------|-------------|
| `screenshots/ct05_retest_suspended.png` | CT-05 — License status after suspension via modal |
| `requests.log` | API request/response log for all CTs |

---

## Conclusion

All retest cases passed. The previously failing CT-04 now correctly returns the current status (ENCERRADA) in the error message. The API now matches the PRD specification: `{"detail": "Somente licenças ATIVAS podem ser suspensas. Status atual: {currentStatus}"}`.

The frontend correctly displays the "Suspender" button for ATIVA licenses, opens the modal with validation, and updates the status after successful suspension.

---
**END OF REPORT**
