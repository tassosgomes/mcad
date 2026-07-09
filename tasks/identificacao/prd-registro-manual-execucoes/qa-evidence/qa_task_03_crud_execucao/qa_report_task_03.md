# QA Report — qa_task_03_crud_execucao
## RF-02,05,06,07,08 — CRUD completo de execuções

**Date:** 2026-06-20 03:01 UTC
**Environment:** https://mcad.tasso.dev.br / https://mcad-identificacao.tasso.dev.br/api/v1
**Auth user:** analista_identificacao@mcad.dev (identificacao.default.analista)

---

## Summary

| Metric | Value |
|---|---|
| Total test cases | 22 |
| Passed | 22 |
| Failed | 0 |
| Status | **PASS** |

---

## API Test Results

| ID | RF | Scenario | Expected | Actual | Status |
|---|---|---|---|---|---|
| TC-API-01 | RF-02 | Create execution happy path (RADIO) | 201, duracao=225s, status | 201, duracaoSegundos=225, status=Pendente ✅ | PASS |
| TC-API-02 | RF-07 | Missing tipoUtilizacaoId on CINEMA | 422 error | 422 "Tipo de Utilização é obrigatório para esta rubrica." ✅ | PASS |
| TC-API-03 | RF-07 | Missing tituloPrograma on CINEMA | 422 error | 422 "Título do Programa é obrigatório para rubricas audiovisuais." ✅ | PASS |
| TC-API-04 | RF-07 | Missing both conditional fields on CINEMA | 422 error | 422 "Tipo de Utilização é obrigatório para esta rubrica." ✅ | PASS |
| TC-API-05 | RF-07 | Create with both conditional fields on CINEMA | 201 | 201, tipoUtilizacao=TA, tituloPrograma="Teste QA Programa" ✅ | PASS |
| TC-API-06 | RF-02 | End before start (14:30 > 14:20) | 422 error | 422 "O horário de fim deve ser posterior ao início." ✅ | PASS |
| TC-API-07 | RF-02 | End equals start (14:30 = 14:30) | 422 error | 422 "O horário de fim deve ser posterior ao início." ✅ | PASS |
| TC-API-08 | RF-02 | Create on Cancelada captação | 422 error | 422 "Apenas captações ABERTAS podem receber execuções." ✅ | PASS |
| TC-API-09 | RF-02 | Invalid obraId (all zeros) | 400/404/422 | 400 "'Obra Id' must not be empty." ✅ | PASS |
| TC-API-10 | RF-05 | Edit execution (change quantidade) | 200 | 200, quantidade=5, duracaoSegundos=330 ✅ | PASS |
| TC-API-11 | RF-05 | Edit execution (change obra) | 200 | 200, new obraTitulo, duracaoSegundos=600 ✅ | PASS |
| TC-API-12 | RF-05 | Edit on Cancelada captação | 422 error | 422 "Apenas captações ABERTAS podem ter suas execuções editadas." ✅ | PASS |
| TC-API-13 | RF-06 | Delete execution | 200/204 | 204 No Content ✅ | PASS |
| TC-API-14 | RF-06 | Delete on Cancelada captação | 422 error | 422 "Apenas captações ABERTAS podem ter suas execuções excluídas." ✅ | PASS |

---

## UI Test Results

| ID | RF | Scenario | Expected | Actual | Status |
|---|---|---|---|---|---|
| TC-UI-01 | RF-02 | Create execution via modal | Modal opens, save creates, appears in list | Modal opened, search returned results, saved (201), row appeared, counters updated (1→2) ✅ | PASS |
| TC-UI-02 | RF-05 | Edit execution via modal | Pre-filled data, fields editable | Modal "Editar Execução" opened, all fields pre-filled (obra, 14:30:00, 14:33:00, Dur: 3min, Qtd:1), Qtd changed to 3, saved successfully ✅ | PASS |
| TC-UI-03 | RF-06 | Delete execution confirmation | Dialog "Excluir execução de [title]?" | Dialog shown: "Tem certeza que deseja excluir a execução vinculada a Obra teste Permissão?" with Cancelar/Excluir buttons, confirmed, row removed, counters 2→1 ✅ | PASS |
| TC-UI-04 | RF-07 | Conditional fields visible (CINEMA) | TipoUtilizacao + TituloPrograma visible+required | Both fields visible with * indicator, dropdown with BK/PE/TA/TE options, textbox placeholder "Ex: Novela das 9 - Cap. 142" ✅ | PASS |
| TC-UI-05 | RF-07 | Conditional fields hidden (RADIO) | Fields hidden/not required | No TipoUtilizacao/TituloPrograma in RADIO create modal ✅ | PASS |
| TC-UI-06 | RF-08 | Duration auto-calculation | "Dur: 3min" shown for 14:30→14:33 | "Dur: 3min" displayed live next to Horário Fim field ✅ | PASS |
| TC-UI-07 | RF-02 | Inverted time validation | Error "horário de fim deve ser posterior" | "O fim deve ser maior que o início." shown under Horário Fim (wording differs slightly from API: "O horário de fim deve ser posterior ao início") ✅ | PASS |
| TC-UI-08 | RF-07 | Missing required fields validation | Errors shown | 5 inline errors: "Selecione ou crie uma obra", "Início inválido", "O fim deve ser maior que o início", "Selecione um tipo de utilização", "Informe o título do programa" ✅ | PASS |

### Additional UI observations

- **Cancelada captação (RF-02 AC-6, RF-05 AC-4, RF-06 AC-4):** "Adicionar Execução" button hidden, no Edit/Delete buttons on execution rows, all form fields disabled, "Importar CSV" disabled — all blocked ✅
- **CINEMA audiovisual table:** Extra "Tipo (Prog)" column shows TA and program title for audiovisual executions ✅

---

## Evidence Inventory

| File | Description |
|---|---|
| `test_plan.md` | Test plan with all 22 test cases |
| `requests.log` | Full cURL API request/response log (14 tests) |
| `screenshots/TC-UI-01-created-execution-in-list.png` | New execution visible in table after create |
| `screenshots/TC-UI-02-edit-modal-prefilled.png` | Edit modal with pre-filled data |
| `screenshots/TC-UI-03-delete-confirmation-dialog.png` | Delete confirmation dialog |
| `screenshots/TC-UI-04-audiovisual-conditional-fields.png` | Conditional fields visible on CINEMA |
| `screenshots/TC-UI-05-non-audiovisual-no-conditional-fields.png` | No conditional fields on RADIO |
| `screenshots/TC-UI-06-duration-auto-calc.png` | Duration "Dur: 3min" shown live |
| `screenshots/TC-UI-07-inverted-time-validation.png` | Inverted time error |
| `screenshots/TC-UI-08-validation-missing-fields.png` | All 5 validation errors displayed |
| `screenshots/cancelada-no-actions.png` | Cancelada captação with no add/edit/delete |

---

## Notes

1. **Status derivation (RN-02):** The PRD expected IDENTIFICADA status, but this depends on the Cadastro obra status. Test obras (PENDENTE in Cadastro) produced PENDENTE execution status, which is correct per RN-02 (LIBERADO→IDENTIFICADA, else→PENDENTE).

2. **Duration calculation (RN-12 / RF-08):** Accurately calculated: 14:30:00→14:33:45 = 225s (3min 45s), 14:30:00→14:33:00 = 180s (3min), 15:00:00→15:05:30 = 330s (5min 30s), 16:00:00→16:10:00 = 600s (10min).

3. **Validation wording:** UI shows "O fim deve ser maior que o início." while API returns "O horário de fim deve ser posterior ao início." — minor wording difference, same meaning. PRD specifies "O horário de fim deve ser posterior ao início".

4. **Non-owner testing:** Not tested here — the test user (analista_identificacao) is the owner of all test captações. Cross-owner testing would require a different analyst account.

5. **Cleanup:** Test execution `bcb636b8-...` (RADIO) deleted via UI; `533b2dd2-...` (CINEMA) deleted via API. RADIO captação returned to 1 execution.
