# QA Report — qa_task_04: Encerrar Licença

**Task ID:** qa_task_04  
**User Story:** HU-04 — Encerrar licença SUSPENSA (RF-09, RF-11, RF-12)  
**Date:** 2026-06-09  
**Status:** ❌ FAIL

## Executive Summary

Execution stopped at **CT-02** due to the mandatory stop-on-first-failure rule. The system correctly returned HTTP 422 when attempting to close an already-ENCERRADA license, but the error message did **not** match the PRD requirement (missing uppercase "ENCERRADA" and the expected full sentence). The remaining test cases (CT-03 through CT-07) were **not executed**.

## Test Case Results

| CT ID | Description | Expected | Actual | Status |
|---|---|---|---|---|
| CT-01 | Close a SUSPENSA license | HTTP 200, status=ENCERRADA | HTTP 200, status=ENCERRADA | ✅ PASS |
| CT-01-HIST | Verify history entry | statusAnterior=SUSPENSA, statusNovo=ENCERRADA, justificativa matching | statusAnterior=SUSPENSA, statusNovo=ENCERRADA, justificativa="Contrato de licenciamento rescindido pelo Usuário de Música" | ✅ PASS |
| CT-02 | Try to close an already ENCERRADA license | HTTP 422, detail contains "ENCERRADA" | HTTP 422, detail="Licenca ja esta encerrada" | ❌ FAIL |
| CT-03 | Try to close an ATIVA license directly | — | Not executed | ⏸️ SKIPPED |
| CT-04 | Try to suspend an ENCERRADA license | — | Not executed | ⏸️ SKIPPED |
| CT-05 | Try to reactivate an ENCERRADA license | — | Not executed | ⏸️ SKIPPED |
| CT-06 | Frontend — Encerrar button visible for SUSPENSA license | — | Not executed | ⏸️ SKIPPED |
| CT-07 | Frontend — Encerrar via modal | — | Not executed | ⏸️ SKIPPED |

## Failure Details

### CT-02 — Try to close an already ENCERRADA license

- **Expected:**
  - HTTP 422
  - `detail` field containing the word **"ENCERRADA"** (per PRD excerpt: *"Licença já está ENCERRADA. Esta transição não é permitida."*)

- **Actual:**
  - HTTP 422 ✅
  - `detail` = `"Licenca ja esta encerrada"` ❌
  - The message is lowercase, missing diacritics, and does not contain the uppercase keyword "ENCERRADA" that the test asserts.

- **Impact:**
  - The business-rule validation is correct (422), but the error message does not follow the PRD contract, which is a **functional requirement** (RF-12 / acceptance criteria).

## Evidence Files

- `requests.log` → `tasks/arrecadacao/prd-gestao-licencas/qa-evidence/qa_task_04_encerrar_licenca/requests.log`
- No screenshots were generated because UI tests (CT-06, CT-07) were skipped after the stop.

## Notes

- **Token:** Bearer token extracted from the browser's authenticated fetch context; all API calls were made via `page.evaluate` with the `Authorization` header to satisfy the BFF anti-bot checks.
- **Precondition:** The SUSPENSA license used in CT-01 (`78626f89-cb9b-4e79-abd9-d9b742769844`) was already present in the environment. It was transitioned to ENCERRADA and left in that terminal state.
- **Stop Rule Applied:** Per the absolute QA rules, execution halted immediately after the first failure (CT-02). No subsequent test cases were attempted, and no test logic was modified to force a pass.
