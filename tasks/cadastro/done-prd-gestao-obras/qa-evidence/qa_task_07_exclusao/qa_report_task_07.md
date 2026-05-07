# QA Report — Exclusão de Obras

**Task ID:** qa_task_07
**Data/Hora:** 2026-04-08T03:00:00Z
**Status Geral:** FAIL

---

## Contexto

- **User Story:** Exclusão de obras — O sistema deve permitir exclusão de obras sem vínculos e que não sejam DEPURADAS, e bloquear exclusão quando houver vínculos ou status DEPURADA.
- **Ambiente:** http://localhost:5001 (API) | http://localhost:5173 (Frontend)
- **Tipos de teste:** API | Banco | UI
- **Autenticação:** Sim (Keycloak externo — keycloak.tasso.dev.br)
- **PRD refs:** RF-27, RF-28, RF-29, RF-30, RF-31, RF-32

---

## Casos de Teste

| ID | Descrição | Tipo | Status |
|----|-----------|------|--------|
| CT-01 | GET obra com ID inexistente retorna 404 | API | PASS |
| CT-02 | DELETE obra DEPURADA retorna 409 | API | PASS |
| CT-03 | DELETE obra com titularidades vinculadas retorna 409 | API | FAIL |
| CT-04 | Criar obra PENDENTE sem vínculos e DELETE retorna 204 | API | PASS |
| CT-05 | GET obra excluída retorna 404 | API | PASS |
| CT-06 | Banco: obra excluída não existe mais na tabela | Banco | PASS |
| CT-07 | UI: modal de confirmação de exclusão e comportamento após excluir | UI | PASS |

---

## Detalhes por Caso

### CT-01 — GET obra com ID inexistente retorna 404 — PASS

**Expected:** HTTP 404
**Actual:** HTTP 404
**Evidências:** `requests.log` (CT-01)

---

### CT-02 — DELETE obra DEPURADA retorna 409 — PASS

**Expected:** HTTP 409 com mensagem mencionando "depurada"
**Actual:** HTTP 409
**Mensagem retornada:** Confirmada referência a "depurada" no body de resposta
**Obra testada:** ID `0a017a52-6c14-48f0-8312-9fac30ff4460` (status DEPURADA confirmado via banco)
**Evidências:** `requests.log` (CT-02)

---

### CT-03 — DELETE obra com titularidades autorais vinculadas retorna 409 — FAIL

**Passos executados:**
1. Consulta banco: identificada obra LIBERADO (`c49adc4e-2aa1-4386-8ee4-121c91e3b901`) com 3 titularidades via `cadastro.titularidades_autorais` (coluna `ObraId`)
2. DELETE /api/v1/obras/c49adc4e-2aa1-4386-8ee4-121c91e3b901
3. Status HTTP recebido: 409 (correto)
4. Mensagem recebida: diverge do especificado no PRD

**Expected:**
- HTTP 409
- Mensagem: `"Obra não pode ser excluída pois possui titularidades autorais vinculadas"`

**Actual:**
- HTTP 409 (correto)
- Mensagem: `"A obra possui vínculos e não pode ser excluída."`

**Erro capturado:**
```json
{
  "title": "Conflict",
  "status": 409,
  "detail": "A obra possui vínculos e não pode ser excluída.",
  "instance": "/api/v1/obras/c49adc4e-2aa1-4386-8ee4-121c91e3b901"
}
```

**Diagnóstico:** O sistema protege corretamente contra exclusão de obras com vínculos (RF-30 comportamento correto), porém a mensagem de erro é genérica ("possui vínculos") em vez de específica para titularidades autorais conforme especificado no PRD. Isso representa não conformidade na mensagem de erro.

**Evidências:** `requests.log` (CT-03, revisão CT-03)

---

### CT-04 — DELETE obra PENDENTE sem vínculos retorna 204 — PASS

**Expected:** Criação com 201, depois DELETE com 204
**Actual:**
- POST /api/v1/obras → HTTP 201, ID `0744daba-933b-4a72-8fc0-a18899275cfc`
- DELETE /api/v1/obras/0744daba-933b-4a72-8fc0-a18899275cfc → HTTP 204

**Observação:** Primeiro POST falhou com HTTP 500 (`"Requested value 'MUSICA' was not found"`) pois o campo `tipo` aceita `MUSICAL` (não `MUSICA`). Corrigido e retestado com `tipo: MUSICAL` — exclusão funcionou corretamente.

**Evidências:** `requests.log` (CT-04)

---

### CT-05 — GET obra excluída retorna 404 — PASS

**Expected:** HTTP 404
**Actual:** HTTP 404
**Obra testada:** ID `0744daba-933b-4a72-8fc0-a18899275cfc` (excluída em CT-04)
**Evidências:** `requests.log` (CT-05)

---

### CT-06 — Banco: obra excluída não existe mais na tabela — PASS

**Expected:** SELECT retorna 0 registros (hard delete)
**Actual:** 0 registros encontrados em `cadastro.obras_musicais` para ID `0744daba-933b-4a72-8fc0-a18899275cfc`
**Conclusão:** Hard delete confirmado (sem soft-delete)
**Evidências:** `requests.log` (CT-06)

---

### CT-07 — UI: modal de confirmação de exclusão e comportamento após excluir — PASS

**Passos executados:**
1. Navegação para `http://localhost:5173/`
2. Autenticação via Keycloak (analista.teste)
3. Navegação para `/cadastro/obras/dbf5a492-aa58-4ea3-a87e-9339de88b053`
4. Botão "Excluir" encontrado e clicado
5. Modal "Excluir Obra" exibido com mensagem: "Tem certeza que deseja excluir esta obra musical Obra QA UI Delete Test?" e aviso "Esta ação removerá permanentemente os dados se não houver vínculos ativos."
6. Botão "Excluir Obra" no modal clicado
7. Redirecionamento para `/cadastro/obras` (lista)

**Expected:**
- Modal de confirmação visível com texto de confirmação
- Após confirmar: redirecionamento para lista de obras

**Actual:**
- Modal exibido corretamente com aviso e botões "Cancelar" / "Excluir Obra"
- Redirecionamento para `/cadastro/obras` confirmado

**Evidências:**
- Screenshot modal: `screenshots/ct07_07_modal_confirmacao.png`
- Screenshot resultado: `screenshots/ct07_10_resultado_final.png`
- Video: `videos/ct07-exclusao-ui-CT-07-UI--935d9-firmação-e-remoção-da-lista/video.webm`
- Playwright log: `requests.log` (CT-07)

---

## Resumo de Evidências

```
tasks/cadastro/prd-gestao-obras/qa-evidence/qa_task_07_exclusao/
├── test_plan.md
├── qa_report_task_07.md
├── requests.log
├── screenshots/
│   ├── ct07_01_home.png
│   ├── ct07_02_keycloak_login.png
│   ├── ct07_03_apos_login.png
│   ├── ct07_04_detalhe_obra.png
│   ├── ct07_05_pre_delete_button.png
│   ├── ct07_06_apos_click_excluir.png
│   ├── ct07_07_modal_confirmacao.png
│   ├── ct07_08_modal_sem_confirmar.png (não gerado — modal encontrado)
│   ├── ct07_09_apos_confirmacao.png
│   └── ct07_10_resultado_final.png
└── videos/
    └── ct07-exclusao-ui-CT-07-UI--935d9-firmação-e-remoção-da-lista/
        ├── video.webm
        └── trace.zip
```

---

## Status para o Orquestrador

**Status:** FAIL
**Motivo da falha:** CT-03 — RF-30 parcialmente implementado. O sistema retorna HTTP 409 corretamente ao tentar excluir obra com titularidades autorais vinculadas, mas a mensagem de erro retornada (`"A obra possui vínculos e não pode ser excluída."`) é genérica, divergindo da especificação do PRD que exige `"Obra não pode ser excluída pois possui titularidades autorais vinculadas"`. O comportamento de bloqueio está correto; apenas a mensagem não está conforme.
**Tasks possivelmente impactadas:** Nenhuma — qa_task_07 é a última task da fase 4.
