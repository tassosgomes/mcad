# QA Report: Task 06 — Detalhes e Histórico

**Task ID:** qa_task_06
**Slug:** detalhes_e_historico
**Description:** HU-06: Detalhes e histórico de transições (RF-13, RF-17)
**Date:** 2026-06-09
**Tester:** QA Task Runner
**Overall Status:** PASS

---

## Test Summary

| Test Case | Description | Status | Evidence |
|---|---|---|---|
| CT-01 | Get license details by ID | PASS | requests.log |
| CT-02 | Get history for the license | PASS | requests.log |
| CT-03 | 404 for non-existent license | PASS | requests.log |
| CT-04 | Frontend — Navigate to license detail | PASS | screenshots/ct04_detail_page.png |
| CT-05 | Frontend — History tab/section | PASS | screenshots/ct05_history_tab.png |

---

## Detailed Results

### CT-01: Get License Details by ID
**Method:** GET `https://mcad-bff.tasso.dev.br/api/arrecadacao/v1/licencas/78626f89-cb9b-4e79-abd9-d9b742769844`

**Expected:**
- HTTP 200
- Response contains: id, usuarioMusica (id, razaoSocial, cnpjFormatado), rubrica (id, sigla, nome), dataInicio, status, criadoEm, atualizadoEm

**Actual:**
- HTTP 200 OK
- Response body:
```json
{
  "id": "78626f89-cb9b-4e79-abd9-d9b742769844",
  "usuarioMusica": {
    "id": "a598cc9b-ca99-4d7b-a3c1-c7e7de3fb912",
    "razaoSocial": "Ankunding, Yost and Quitzon",
    "cnpjFormatado": "94.339.576/0254-69"
  },
  "rubrica": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "sigla": "RADIO",
    "nome": "Rádio AM/FM",
    "ativo": true
  },
  "dataInicio": "2026-06-09",
  "dataFim": null,
  "status": "ATIVA",
  "criadoEm": "2026-06-09T12:26:24.297791Z",
  "atualizadoEm": "2026-06-09T12:26:24.297799Z"
}
```

**Status:** PASS

---

### CT-02: Get History for the License
**Method:** GET `https://mcad-bff.tasso.dev.br/api/arrecadacao/v1/licencas/78626f89-cb9b-4e79-abd9-d9b742769844/historico-status`

**Expected:**
- HTTP 200
- Response is array with at least 1 entry
- Each entry has: id, statusAnterior, statusNovo, justificativa, autor, data
- Creation entry: statusAnterior == null, statusNovo == "ATIVA", justificativa contains "criada"

**Actual:**
- HTTP 200 OK
- Response body (1 entry):
```json
[
  {
    "id": "4cc6d043-a3b4-4b1b-82eb-3f7e901a7df3",
    "statusAnterior": null,
    "statusNovo": "ATIVA",
    "justificativa": "Licenca criada",
    "autor": "Analista Arrecadacao (analista_arrecadacao)",
    "ator": {
      "subject": "qjj246ihe9zy",
      "label": "Analista Arrecadacao (analista_arrecadacao)",
      "username": "analista_arrecadacao",
      "displayName": "Analista Arrecadacao",
      "email": "analista_arrecadacao@mcad.dev",
      "status": "ATIVO"
    },
    "data": "2026-06-09T12:26:24.303226Z"
  }
]
```

**Status:** PASS

---

### CT-03: 404 for Non-Existent License
**Method:** GET `https://mcad-bff.tasso.dev.br/api/arrecadacao/v1/licencas/00000000-0000-0000-0000-000000000000`

**Expected:**
- HTTP 404

**Actual:**
- HTTP 404 Not Found
- Response body:
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.4",
  "title": "Resource Not Found",
  "status": 404,
  "detail": "Licenca nao encontrada: 00000000-0000-0000-0000-000000000000",
  "instance": "/api/v1/licencas/00000000-0000-0000-0000-000000000000"
}
```

**Status:** PASS

---

### CT-04: Frontend — Navigate to License Detail
**Steps:**
1. Navigate to `https://mcad.tasso.dev.br/arrecadacao/licencas`
2. Navigate directly to `https://mcad.tasso.dev.br/arrecadacao/licencas/78626f89-cb9b-4e79-abd9-d9b742769844`

**Expected:**
- Detail page shows license ID or number
- Expanded usuario de musica info (name, CNPJ)
- Expanded rubrica info (sigla, name)
- Status badge
- Data inicio and data fim

**Actual:**
- Page title: "Licença #78626F89"
- Usuario de Música: Ankunding, Yost and Quitzon, 94.339.576/0254-69
- Rubrica: RADIO — Rádio AM/FM
- Vigência: 09/06/2026 → Indefinida
- Status: Ativa (green badge)
- Criado em: 09/06/2026, 09:26
- Atualizado em: 09/06/2026, 09:26

**Status:** PASS

**Evidence:** `screenshots/ct04_detail_page.png`

---

### CT-05: Frontend — History Section
**Steps:**
1. On the detail page, observe the "Histórico de Status" section

**Expected:**
- History timeline/table shows at least one entry for license creation
- Status transition (e.g., null → ATIVA)
- Justificativa text
- Author name
- Date/time

**Actual:**
- Section "Histórico de Status" is visible
- 1 entry displayed:
  - Status: — → Ativa
  - Date: 09/06/2026, 09:26
  - Author: Analista Arrecadacao (analista_arrecadacao)
  - Justificativa: Licença criada

**Status:** PASS

**Evidence:** `screenshots/ct05_history_tab.png`

---

## Notes

- The frontend detail page displays the history as a section (not a separate tab), which is a valid UI implementation.
- The API returns the `ator` object in addition to the `autor` string, providing richer metadata about the actor.
- The `autor` field format is "Display Name (username)" instead of just the username, which is a richer representation than the minimal PRD example.
- All API responses match the contracts defined in the PRD.

## Conclusion

All 5 test cases passed. The feature "Detalhes e Histórico" is working correctly.
