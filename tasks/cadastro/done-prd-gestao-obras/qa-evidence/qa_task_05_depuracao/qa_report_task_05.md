# QA Report — Depuração Automática de Obras LIBERADAS

**Task ID:** qa_task_05
**Data/Hora:** 2026-04-09T01:10:00Z
**Status Geral:** PASS

---

## Contexto

- **User Story:** Depuração automática — Quando uma obra LIBERADA (com ISWC) sofre alteração de título, o sistema deve depurar a obra original (torná-la imutável com status DEPURADA) e criar automaticamente uma nova obra PENDENTE com os dados atualizados.
- **Ambiente:** http://localhost:5001 (API) | http://localhost:5173 (Frontend)
- **Tipos de teste:** API | Banco | UI
- **Autenticação:** Sim (analista.teste via Keycloak https://keycloak.tasso.dev.br)
- **Obra utilizada:** "Garota de Ipanema" (id: 9f5729f0-0cfc-41dd-9af5-0c90c77623c9, ISWC: T-721428352-3)
- **Nova obra criada:** "Garota de Ipanema (Remasterizada)" (id: 9117207c-cb35-4f71-b425-a046a27e218b)

---

## Casos de Teste

| ID    | Descrição                                                                 | Tipo   | Status |
|-------|---------------------------------------------------------------------------|--------|--------|
| CT-01 | PUT em obra LIBERADA alterando título retorna 409 DEPURACAO_NECESSARIA   | API    | PASS   |
| CT-02 | PUT em obra LIBERADA alterando apenas gênero retorna 200 (sem depuração) | API    | PASS   |
| CT-03 | POST /depurar cria novaObra PENDENTE e depura original — resposta 201     | API    | PASS   |
| CT-04 | Banco: obra original com Status=DEPURADA, ISWC mantido, ObraDepuradaParaId correto | Banco  | PASS   |
| CT-05 | Banco: nova obra com Status=PENDENTE, ISWC=null, título atualizado        | Banco  | PASS   |
| CT-06 | PUT em obra DEPURADA retorna 422 (imutável)                               | API    | PASS   |
| CT-07 | GET obra DEPURADA retorna campo obraDepuradaParaId preenchido             | API    | PASS   |
| CT-08 | UI: banner "Esta obra foi depurada" e referência à nova obra visível      | UI     | PASS   |

---

## Detalhes por Caso

### CT-01 — PUT em obra LIBERADA alterando título retorna 409 DEPURACAO_NECESSARIA — PASS

**RF coberto:** RF-06

**Expected:** HTTP 409, body com campo `code` = `"DEPURACAO_NECESSARIA"`

**Actual:**
```json
{
  "title": "Depuração Necessária",
  "status": 409,
  "detail": "Alterar o título requer depuração",
  "instance": "/api/v1/obras/9f5729f0-0cfc-41dd-9af5-0c90c77623c9",
  "code": "DEPURACAO_NECESSARIA"
}
```

**Evidências:** `requests.log` linha 1–19

---

### CT-02 — PUT em obra LIBERADA alterando apenas gênero retorna 200 — PASS

**RF coberto:** RF-10

**Expected:** HTTP 200, sem disparo de depuração, obra permanece LIBERADA

**Actual:** HTTP 200, `status: "LIBERADO"`, `genero: "MPB"` (atualizado de "Bossa Nova"). Título inalterado, ISWC mantido.

**Evidências:** `requests.log` linha 20–46

---

### CT-03 — POST /depurar cria nova obra PENDENTE e depura original — PASS

**RF coberto:** RF-07

**Expected:** HTTP 201, body com `obraDepurada.status = "DEPURADA"` e `novaObra.status = "PENDENTE"`, `novaObra.iswc = null`

**Actual:**
- `obraDepurada.status` = `"DEPURADA"`, `iswc` = `"T-721428352-3"` (mantido), `obraDepuradaParaId` = `"9117207c-cb35-4f71-b425-a046a27e218b"`
- `novaObra.status` = `"PENDENTE"`, `iswc` = `null`, `titulo` = `"Garota de Ipanema (Remasterizada)"`

**Evidências:** `requests.log` linha 47–90

---

### CT-04 — Banco: obra original com Status=DEPURADA, ISWC mantido, ObraDepuradaParaId correto — PASS

**RF coberto:** RF-07, RF-08

**Expected:** `Status=DEPURADA`, `Iswc=T-721428352-3`, `ObraDepuradaParaId=9117207c-cb35-4f71-b425-a046a27e218b`

**Actual (psql):**
```
9f5729f0-...|Garota de Ipanema|DEPURADA|T-721428352-3|9117207c-cb35-4f71-b425-a046a27e218b
```

Todos os três campos verificados estão corretos.

**Evidências:** `requests.log` linha 91–96

---

### CT-05 — Banco: nova obra com Status=PENDENTE, ISWC=null, título atualizado — PASS

**RF coberto:** RF-09

**Expected:** `Status=PENDENTE`, `Iswc=null (vazio)`, `Titulo=Garota de Ipanema (Remasterizada)`

**Actual (psql):**
```
9117207c-...|Garota de Ipanema (Remasterizada)|PENDENTE|
```

ISWC está vazio (null), status PENDENTE e título correto.

**Evidências:** `requests.log` linha 97–102

---

### CT-06 — PUT em obra DEPURADA retorna 422 (imutável) — PASS

**RF coberto:** RF-08

**Expected:** HTTP 422, obra rejeitada como imutável

**Actual:**
```json
{
  "title": "Unprocessable Entity",
  "status": 422,
  "detail": "Obras depuradas não podem ser editadas",
  "instance": "/api/v1/obras/9f5729f0-0cfc-41dd-9af5-0c90c77623c9"
}
```

**Evidências:** `requests.log` linha 103–120

---

### CT-07 — GET obra DEPURADA com obraDepuradaParaId preenchido — PASS

**RF coberto:** RF-07

**Expected:** HTTP 200, `status = "DEPURADA"`, `obraDepuradaParaId = "9117207c-cb35-4f71-b425-a046a27e218b"`

**Actual:** HTTP 200, todos os campos corretos. `obraDepuradaParaId` aponta corretamente para a nova obra.

**Evidências:** `requests.log` linha 121–146

---

### CT-08 — UI: banner "Esta obra foi depurada" e referência à nova obra — PASS

**RF coberto:** RF-06, RF-07

**Expected:** Página `/cadastro/obras/{id}` deve exibir indicação de depuração e referência à nova obra

**Actual (texto extraído da UI):**
```
DEPURADA
Esta obra foi depurada.
Ela foi substituída por uma nova versão (#16) →
```

O ID da nova obra (`9117207c-cb35-4f71-b425-a046a27e218b`) estava presente no conteúdo da página. Badge de status "DEPURADA" e banner "Esta obra foi depurada." visíveis. Link/referência para nova obra (#16) presente.

**Evidências:**
- Screenshots: `screenshots/ct08_01_home.png`, `ct08_03_obra_depurada_inicial.png`, `ct08_04_obra_depurada.png`, `ct08_05_pre_assertion.png`, `ct08_06_final.png`
- Vídeo: `videos/ct08_depuracao_ui-CT-08-UI-4abe9-e-referência-para-nova-obra/video.webm`
- Trace: `videos/ct08_depuracao_ui-CT-08-UI-4abe9-e-referência-para-nova-obra/trace.zip`
- Log: `requests.log` linha 148–222

---

## Resumo de Evidências

```
tasks/cadastro/prd-gestao-obras/qa-evidence/qa_task_05_depuracao/
├── test_plan.md
├── qa_report_task_05.md
├── requests.log
├── screenshots/
│   ├── ct08_01_home.png
│   ├── ct08_03_obra_depurada_inicial.png
│   ├── ct08_04_obra_depurada.png
│   ├── ct08_05_pre_assertion.png
│   └── ct08_06_final.png
└── videos/
    └── ct08_depuracao_ui-.../
        ├── video.webm
        └── trace.zip
```

---

## Status para o Orquestrador

**Status:** PASS
**Motivo da falha:** N/A — todos os 8 casos de teste passaram
**Tasks possivelmente impactadas:** qa_task_07 (Exclusao) — depende desta task e pode executar normalmente
