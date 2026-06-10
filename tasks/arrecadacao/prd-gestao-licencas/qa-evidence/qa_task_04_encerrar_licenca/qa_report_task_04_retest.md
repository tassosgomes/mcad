# QA Report — qa_task_04: Encerrar Licença (RETEST)

**Task ID:** qa_task_04_retest  
**User Story:** HU-04 — Encerrar licença SUSPENSA (RF-09, RF-11, RF-12)  
**Date:** 2026-06-10  
**Status:** ✅ PASS

---

## Executive Summary

All retest cases passed successfully. The previously failed **CT-02** (error message casing) now returns the correct PRD-compliant message with uppercase "ENCERRADA" and proper accents. The happy path (CT-01), ATIVA validation (CT-03), and frontend tests (CT-06, CT-07) all passed.

---

## Test Case Results

| CT ID | Description | Type | Status |
|-------|-------------|------|--------|
| CT-01 | Close a SUSPENSA license (API) | API | ✅ PASS |
| CT-02 | Try to close an already ENCERRADA license | API | ✅ PASS |
| CT-03 | Try to close an ATIVA license directly | API | ✅ PASS |
| CT-06 | Frontend — Encerrar button visible for SUSPENSA | UI | ✅ PASS |
| CT-07 | Frontend — Encerrar via modal | UI | ✅ PASS |

---

## Detalhes por Caso

### CT-01 — Close a SUSPENSA license (API) ✅ PASS

**Pre-condição:** ATIVA license suspended to create SUSPENSA state.
**Passos executados:**
1. POST `/api/v1/licencas/4421b958-a94c-48a3-b01b-2f808d0650e5/encerrar`
2. Body: `{"justificativa": "Contrato rescindido"}`

**Expected:** HTTP 200, status="ENCERRADA"
**Actual:** HTTP 200, status="ENCERRADA" ✅

**Evidências:**
- Request/Response: `requests.log` (linha 170-172)
- Result JSON: `ct01_result.json`

---

### CT-02 — Try to close an already ENCERRADA license ✅ PASS

**Pre-condição:** License `01f8af48-672f-47d3-b376-16bdba0d1d94` already in status ENCERRADA.
**Passos executados:**
1. POST `/api/v1/licencas/01f8af48-672f-47d3-b376-16bdba0d1d94/encerrar`
2. Body: `{"justificativa": "Tentativa de encerramento duplicado"}`

**Expected:** HTTP 422, detail containing "ENCERRADA" (per PRD: *"Licença já está ENCERRADA. Esta transição não é permitida."*)
**Actual:**
- HTTP 422 ✅
- `detail` = `"Licença já está ENCERRADA. Esta transição não é permitida."` ✅

**Previous failure (fixed):**
- Previous run: `detail` = `"Licenca ja esta encerrada"` (lowercase, no accents)
- Current run: `detail` = `"Licença já está ENCERRADA. Esta transição não é permitida."` (PRD-compliant)

**Evidências:**
- Request/Response: `requests.log` (linha 174-176)
- Result JSON: `ct02_result.json`

---

### CT-03 — Try to close an ATIVA license directly ✅ PASS

**Pre-condição:** License `c95adb34-fcef-43cb-be5a-aaab951fbed9` in status ATIVA.
**Passos executados:**
1. POST `/api/v1/licencas/c95adb34-fcef-43cb-be5a-aaab951fbed9/encerrar`
2. Body: `{"justificativa": "Tentativa de encerrar ativa"}`

**Expected:** HTTP 422, detail instructing to suspend first
**Actual:**
- HTTP 422 ✅
- `detail` = `"Licenca deve ser suspensa antes de ser encerrada"` ✅

**Evidências:**
- Request/Response: `requests.log` (linha 178-180)
- Result JSON: `ct03_result.json`

---

### CT-06 — Frontend — Encerrar button visible for SUSPENSA license ✅ PASS

**Pre-condição:** SUSPENSA license created via API suspension.
**Passos executados:**
1. Navigate to `/arrecadacao/licencas/{id}`
2. Wait for page to load

**Expected:** "Encerrar" button is visible
**Actual:** `hasEncerrarBtn` = `true` ✅

**Evidências:**
- Screenshot: `screenshots/ct06_retest_encerrar_button.png`
- Result JSON: `ct06_result.json`

---

### CT-07 — Frontend — Encerrar via modal ✅ PASS

**Pre-condição:** CT-06 passed (Encerrar button visible).
**Passos executados:**
1. Click "Encerrar" button
2. Fill justificativa: "Contrato rescindido"
3. Check "Entendo que esta ação é irreversível" checkbox
4. Click "Encerrar" in modal

**Expected:** Status changes to "Encerrada" (gray badge)
**Actual:** `hasEncerrada` = `true` ✅ (toast message "Licença encerrada com sucesso" visible)

**Evidências:**
- Screenshot modal open: `screenshots/ct07_modal_open.png`
- Screenshot after submit: `screenshots/ct07_retest_encerrada.png`
- Result JSON: `ct07_result.json`

---

## Resumo de Evidências

```
qa_task_04_encerrar_licenca/
├── qa_report_task_04_retest.md
├── screenshots/
│   ├── login_after.png
│   ├── licencas_page.png
│   ├── ct06_retest_encerrar_button.png
│   ├── ct07_modal_open.png
│   └── ct07_retest_encerrada.png
├── ct01_result.json
├── ct02_result.json
├── ct03_result.json
├── ct06_result.json
├── ct07_result.json
└── requests.log
```

---

## Informações para o Orquestrador

**Status final:** PASS
**Motivo:** Todos os casos de teste retestados passaram. CT-02 (previamente falho) agora retorna a mensagem correta conforme PRD.
**Tasks possivelmente impactadas:** Nenhuma — todos os casos de transição de status estão validados.
