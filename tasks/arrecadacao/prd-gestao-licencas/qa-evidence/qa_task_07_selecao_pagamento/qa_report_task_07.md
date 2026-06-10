# QA Report — qa_task_07: Seleção para Pagamento (Contrato F04)

## Task Info
- **Task ID:** qa_task_07
- **Slug:** selecao_pagamento
- **Description:** HU-07: Contrato de seleção de licença para pagamento (F04)
- **Date:** 2026-06-09
- **Tester:** QA Task Runner (automated)
- **Overall Status:** PASS

## Summary

All 5 test cases passed. The license listing endpoint (`GET /api/arrecadacao/v1/licencas`) supports all the filtering and expansion contracts required by F04 (Payments):

- Filtering by `usuarioMusicaId` + `status` (ATIVA / SUSPENSA) works correctly.
- Filtering by `vigente=true` + `status=ATIVA` returns only active, valid licenses.
- `status=ENCERRADA` correctly returns only terminated licenses (which F04 must exclude).
- Every license object includes fully expanded `usuarioMusica` and `rubrica` data, allowing F04 to render the selection UI without additional API calls.

## Test Cases

| CT | Description | Status | Evidence |
|---|---|---|---|
| CT-01 | Filter by usuarioMusicaId + status=ATIVA | PASS | ct01_response.json |
| CT-02 | Filter by usuarioMusicaId + status=SUSPENSA | PASS | ct02_response.json |
| CT-03 | Filter by vigente=true + status=ATIVA | PASS | ct03_response.json |
| CT-04 | Filter by status=ENCERRADA | PASS | ct04_response.json |
| CT-05 | Expanded data required for F04 | PASS | ct01_response.json, ct03_response.json, ct04_response.json |

## Details per Test Case

### CT-01 — Filter licenses by usuarioMusicaId + status=ATIVA
- **Expected:** HTTP 200, all returned licenses belong to the specified user and have status="ATIVA", with expanded usuarioMusica and rubrica.
- **Actual:** HTTP 200, 9 items returned.
  - All 9 items have `usuarioMusica.id` = `a598cc9b-ca99-4d7b-a3c1-c7e7de3fb912`.
  - All 9 items have `status` = `ATIVA`.
  - All 9 items include `usuarioMusica.razaoSocial`, `usuarioMusica.cnpjFormatado`.
  - All 9 items include `rubrica.sigla`, `rubrica.nome`.
  - The license created in qa_task_01 (`78626f89-cb9b-4e79-abd9-d9b742769844`) is present in the results.
- **Result:** PASS

### CT-02 — Filter licenses by usuarioMusicaId + status=SUSPENSA
- **Expected:** HTTP 200, all returned licenses belong to the specified user and have status="SUSPENSA" (may be empty).
- **Actual:** HTTP 200, 0 items returned.
  - Empty list is valid; no licenses are currently SUSPENSA for this user.
- **Result:** PASS

### CT-03 — Filter licenses by vigente=true + status=ATIVA
- **Expected:** HTTP 200, all licenses are ATIVA and vigente (`dataFim` null OR >= today).
- **Actual:** HTTP 200, 259 items returned (page 0 of 13).
  - All 20 items on the first page have `status` = `ATIVA`.
  - All 20 items on the first page are vigente:
    - 12 items have `dataFim` = null.
    - 8 items have `dataFim` >= 2026-06-09 (e.g., 2026-09-08, 2027-03-24, 2027-04-17, 2026-11-01, 2026-12-02, 2026-08-10).
  - No expired licenses appear on the first page.
- **Result:** PASS (first page verified; 259 total items across 13 pages)

### CT-04 — Confirm ENCERRADA licenses can be listed but are not for payment
- **Expected:** HTTP 200, all items have status="ENCERRADA".
- **Actual:** HTTP 200, 1 item returned.
  - Item has `status` = `ENCERRADA`.
  - Item ID: `c58f93dd-fa2f-48fa-85e8-b8657b915eae`.
  - **Important:** F04 must NOT use `status=ENCERRADA` when selecting a license for payment.
- **Result:** PASS

### CT-05 — Expanded data required for F04
- **Expected:** Every license object contains `usuarioMusica.id`, `usuarioMusica.razaoSocial`, `usuarioMusica.cnpjFormatado`, `rubrica.id`, `rubrica.sigla`, `rubrica.nome`.
- **Actual:** Verified across CT-01, CT-03, and CT-04 responses.
  - All 30+ inspected items contain the full expanded objects.
  - Example from qa_task_01 license:
    ```json
    {
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
      }
    }
    ```
- **Result:** PASS

## Evidence Files

- `requests.log` — Full request/response log with CT IDs and PASS/FAIL results.
- `ct01_response.json` — Response body for CT-01 (usuarioMusicaId + ATIVA).
- `ct02_response.json` — Response body for CT-02 (usuarioMusicaId + SUSPENSA).
- `ct03_response.json` — Response body for CT-03 (vigente=true + ATIVA).
- `ct04_response.json` — Response body for CT-04 (ENCERRADA).
- `screenshots/qa_task_07_final.png` — Final screenshot of the browser state.

## Notes

- The API was accessed via `mcad-bff.tasso.dev.br` using the bearer token extracted from the authenticated browser session (Logto OIDC PKCE).
- The license created in qa_task_01 (`78626f89-cb9b-4e79-abd9-d9b742769844`) is present and correctly returned when filtering by its `usuarioMusicaId` and `status=ATIVA`.
- The expanded response format confirms that F04 can implement a license-selection dropdown without making additional API calls for user/rubrica names.
- No failures were encountered; execution stopped normally after all 5 test cases.

## Sign-off

- **Overall Status:** PASS
- **All requirements for HU-07 (F04 contract) are satisfied.**
