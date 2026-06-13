# QA Report - Task 02: UDA Vigente

## Task Metadata
- **Task ID**: `qa_task_02`
- **Slug**: `uda_vigente`
- **User Story**: HU-06 — Consultar UDA vigente
- **Executed At**: 2026-06-10
- **Tester**: QA Task Runner (subagente)
- **Status**: **PASS**

---

## Casos de Teste Executados

### CT-01: Consultar UDA vigente via API
**Resultado**: PASS

- **Endpoint**: `GET https://mcad-bff.tasso.dev.br/api/arrecadacao/v1/uda/vigente`
- **Auth**: Bearer token (LogTo JWT)
- **Response Status**: 200 OK
- **Response Body**:
  ```json
  {
    "id": "d1e2f3a4-b5c6-7890-abcd-111111111111",
    "valor": "107.310000",
    "dataVigencia": "2026-01-01",
    "criadoEm": "2026-05-06T21:49:38.558482Z",
    "criadoPor": null,
    "criadoPorAtor": {
      "subject": null,
      "label": null,
      "username": null,
      "displayName": null,
      "email": null,
      "status": "DESCONHECIDO"
    }
  }
  ```
- **Observações**: O valor retornado é o seed R$ 107,31 (formato string `107.310000`).
  O campo `criadoPor` está `null` e `criadoPorAtor.status` é `DESCONHECIDO`, indicando que o registro foi criado pelo sistema (seed) e não por um usuário real.

---

### CT-02: Consultar UDA vigente via UI
**Resultado**: PASS

- **URL**: `https://mcad.tasso.dev.br/arrecadacao/uda`
- **Navegação**: Acessada via sidebar (Arrecadação → UDA)
- **UI Elements Verificados**:
  - Card "Valor Vigente da UDA" exibido com valor **R$ 107,31**
  - Texto "Vigente desde 01/01/2026"
  - Texto "Configurado por Sistema"
  - Tabela de "Histórico de Valores" presente abaixo
- **Screenshot**: `screenshots/ct02_uda_vigente_ui.png`
- **Observações**: A UI reflete corretamente o valor retornado pela API. A data de vigência está formatada em locale pt-BR (`01/01/2026`).

---

### CT-03: Validar formato dos valores
**Resultado**: PASS

- **valor**: string `"107.310000"` — PASS (esperado string, não número)
- **dataVigencia**: `"2026-01-01"` — PASS (formato `YYYY-MM-DD`)
- **criadoEm**: `"2026-05-06T21:49:38.558482Z"` — PASS (ISO 8601 com timezone Z)

---

## Evidências
- **Requests/Responses**: `logs/requests.log`
- **Screenshot UI**: `screenshots/ct02_uda_vigente_ui.png`

---

## Resumo
| CT | Descrição | Status |
|---|---|---|
| CT-01 | API GET /uda/vigente retorna 200 com valor correto | PASS |
| CT-02 | UI exibe valor vigente e data de vigência | PASS |
| CT-03 | Formato dos campos (string, ISO, YYYY-MM-DD) | PASS |

---

## Notas
- O token JWT foi obtido via fluxo de login LogTo (PKCE + authorization code) com sucesso.
- A API é acessada via BFF (`mcad-bff.tasso.dev.br`), não diretamente pelo frontend.
- O valor vigente é o seed R$ 107,31. Valores futuros no histórico (R$ 115,00, R$ 115,50, R$ 120,50, R$ 130,00) têm datas de vigência posteriores (01/07/2026, 01/12/2026) e ainda não estão vigentes.
