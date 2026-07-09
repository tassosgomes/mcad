# Test Plan — qa_task_03_crud_execucao
## RF-02,05,06,07,08 — CRUD completo de execuções

### API Tests

| ID | RF | Scenario | Method | Expected | Priority |
|---|---|---|---|---|---|
| TC-API-01 | RF-02 | Create execution happy path (obra, start, end, quantidade) | POST /api/v1/captacoes/{id}/execucoes | 201, status=IDENTIFICADA, duracao calculated | P0 |
| TC-API-02 | RF-02 | Create execution with missing tipoUtilizacaoId on audiovisual rubric | POST .../execucoes | 400/422, error about tipoUtilizacaoId required | P0 |
| TC-API-03 | RF-02 | Create execution with missing tituloPrograma on audiovisual rubric | POST .../execucoes | 400/422, error about tituloPrograma required | P0 |
| TC-API-04 | RF-07 | Create execution on non-audiovisual rubric without conditional fields | POST .../execucoes | 201, succeeds (fields optional) | P0 |
| TC-API-05 | RF-02 | Create execution with end before start | POST .../execucoes | 400/422, "horário de fim deve ser posterior" | P0 |
| TC-API-06 | RF-02 | Create execution with end equal to start | POST .../execucoes | 400/422, (zero duration or validation error) | P1 |
| TC-API-07 | RF-02 | Create execution on FECHADA captação | POST .../execucoes | 400/422/403, captação não aberta | P0 |
| TC-API-08 | RF-02 | Create execution with invalid obraId | POST .../execucoes | 400/404/422 | P1 |
| TC-API-09 | RF-05 | Edit execution happy path | PUT .../execucoes/{id} | 200, fields updated | P0 |
| TC-API-10 | RF-05 | Edit execution change obra/fonograma | PUT .../execucoes/{id} | 200, new link, status recalculated | P1 |
| TC-API-11 | RF-05 | Edit execution on FECHADA captação | PUT .../execucoes/{id} | 400/422/403, captação não aberta | P0 |
| TC-API-12 | RF-06 | Delete execution happy path | DELETE .../execucoes/{id} | 200/204, execution removed | P0 |
| TC-API-13 | RF-06 | Delete execution on FECHADA captação | DELETE .../execucoes/{id} | 400/422/403, captação não aberta | P0 |
| TC-API-14 | RF-08 | Verify duration auto-calculation in create response | POST .../execucoes | duration field = 225s (3min45s) for 14:30→14:33:45 | P0 |

### UI Tests

| ID | RF | Scenario | Expected | Priority |
|---|---|---|---|---|
| TC-UI-01 | RF-02 | Create execution via modal - full flow | Modal opens, search works, save creates execution, appears in list | P0 |
| TC-UI-02 | RF-05 | Edit execution via modal | Edit button opens modal with pre-filled data, save updates execution | P0 |
| TC-UI-03 | RF-06 | Delete execution with confirmation dialog | Delete button shows "Excluir execução de [title]?" dialog, confirm removes execution | P0 |
| TC-UI-04 | RF-07 | Conditional fields visible for audiovisual rubric | "Tipo de Utilização" and "Título do Programa" fields visible | P0 |
| TC-UI-05 | RF-07 | Conditional fields hidden for non-audiovisual rubric | "Tipo de Utilização" and "Título do Programa" hidden/not required | P0 |
| TC-UI-06 | RF-08 | Duration auto-calculation on time change | Changing start/end updates duration live | P0 |
| TC-UI-07 | RF-02 | Validation: inverted time | Form shows error "horário de fim deve ser posterior ao início" | P1 |
| TC-UI-08 | RF-02 | Validation: missing required fields on audiovisual rubric | Form shows error for tipoUtilizacaoId/tituloPrograma | P1 |
