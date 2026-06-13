# QA Report — Task qa_task_04_historico_uda

## Informações da Task
- **Task ID**: qa_task_04
- **Slug**: historico_uda
- **User Story**: HU-02 — Consultar histórico da UDA
- **Descrição**: Como Analista ou Consultor, quero visualizar todos os registros históricos de valor da UDA, para que eu possa auditar a evolução dos valores ao longo do tempo.
- **Data de Execução**: 2026-06-10
- **Executor**: QA Task Runner

---

## Resumo Executivo

| Caso | Tipo | Status | Observação |
|---|---|---|---|
| CT-01 | API | ✅ PASS | Retornou 200 com array de 5 registros, ordenado DESC |
| CT-02 | UI | ✅ PASS | Tabela renderiza corretamente com todos os registros |
| CT-03 | API | ✅ PASS | Ordenação DESC confirmada (maior dataVigencia primeiro) |

---

## CT-01: Consultar histórico via API

### Requisição
```
GET https://mcad-bff.tasso.dev.br/api/arrecadacao/v1/uda/historico
Authorization: Bearer eyJhbGciOiJFUzM4NCIsInR5cCI6ImF0K2p3dCIsImtpZCI6IkE1YzFzdHNpZnJid3QxRS0zNzcyQ1V0aC14QkxCcmxRSDdCVWlVZU84TDgifQ.eyJqdGkiOiJzSWtPZ1VLR0lpRVJ2RWxpZVdBZ1QiLCJzdWIiOiJxamoyNDZpaGU5enkiLCJpYXQiOjE3ODExMjA4ODgsImV4cCI6MTc4MTEyNDQ4OCwic2NvcGUiOiIiLCJjbGllbnRfaWQiOiJiMG84dzE4c3lydjk1Z2QybzNrZWUiLCJpc3MiOiJodHRwczovLzlsY2ludS5sb2d0by5hcHAvb2lkYyIsImF1ZCI6Imh0dHBzOi8vYXBpLm1jYWQubG9jYWwifQ.QLKHX76vjYB_A1acCVdAeVO0AGI-C1sr3WG9oKchiaAJ_sWIfwbkiI7iPFN7grDlIPlp3pcBje2qMneye6PE9mI36_WIGCsuTCg0Tli_9P-draQli5a47IEK881ho8wP
Accept: application/json
```

### Response
- **Status**: 200 OK
- **Content-Type**: application/json
- **Body**: Array com 5 registros

```json
[
  {
    "id": "7163de9f-0372-4df1-9db3-b15ecb86918f",
    "valor": "130.000000",
    "dataVigencia": "2026-12-01",
    "criadoEm": "2026-06-10T19:48:51.350555Z",
    "criadoPor": "Analista Arrecadacao (analista_arrecadacao)",
    "criadoPorAtor": { "subject": "qjj246ihe9zy", "label": "Analista Arrecadacao (analista_arrecadacao)", "username": "analista_arrecadacao", "displayName": "Analista Arrecadacao", "email": "analista_arrecadacao@mcad.dev", "status": "ATIVO" }
  },
  {
    "id": "30d83c4c-f46e-4a23-b1c9-60ea162e4190",
    "valor": "115.500000",
    "dataVigencia": "2026-07-01",
    "criadoEm": "2026-06-04T14:48:14.881169Z",
    "criadoPor": "Analista Arrecadacao (analista_arrecadacao)",
    "criadoPorAtor": { "subject": "qjj246ihe9zy", ... }
  },
  {
    "id": "ebc97386-c4ac-46eb-864e-91e4dff1fcbd",
    "valor": "115.000000",
    "dataVigencia": "2026-07-01",
    "criadoEm": "2026-06-10T19:48:36.373456Z",
    "criadoPor": "Analista Arrecadacao (analista_arrecadacao)",
    "criadoPorAtor": { "subject": "qjj246ihe9zy", ... }
  },
  {
    "id": "5cb4a3e8-c926-461a-8638-d66b78b40242",
    "valor": "115.000000",
    "dataVigencia": "2026-07-01",
    "criadoEm": "2026-06-10T19:48:44.253603Z",
    "criadoPor": "Analista Arrecadacao (analista_arrecadacao)",
    "criadoPorAtor": { "subject": "qjj246ihe9zy", ... }
  },
  {
    "id": "d1e2f3a4-b5c6-7890-abcd-111111111111",
    "valor": "107.310000",
    "dataVigencia": "2026-01-01",
    "criadoEm": "2026-05-06T21:49:38.558482Z",
    "criadoPor": null,
    "criadoPorAtor": { "subject": null, "label": null, "username": null, "displayName": null, "email": null, "status": "DESCONHECIDO" }
  }
]
```

### Validação
| Campo | Esperado | Atual | Status |
|---|---|---|---|
| Status HTTP | 200 | 200 | ✅ |
| Array | Array com ≥1 item | 5 itens | ✅ |
| Campos presentes | `id`, `valor`, `dataVigencia`, `criadoEm`, `criadoPor` | Todos presentes | ✅ |
| `criadoPor` (seed) | null | null | ✅ |
| `valor` (seed) | 107.31 | 107.310000 | ✅ |

### Resultado
✅ **PASS**

---

## CT-02: Consultar histórico via UI

### Ações
1. Acessar https://mcad.tasso.dev.br
2. Login automático com `analista_arrecadacao` via LogTo
3. Redirecionado para `/arrecadacao/uda`
4. Página renderiza tabela "Histórico de Valores"

### Estado da UI
A página exibe:
- Valor Vigente da UDA: **R$ 107,31** (Vigente desde 01/01/2026, Configurado por Sistema)
- Tabela "Histórico de Valores" com 5 linhas:

| Valor | Data Vigência | Criado Em | Criado Por |
|---|---|---|---|
| R$ 130,00 | 01/12/2026 | 10/06/2026, 16:48 | Analista Arrecadacao (analista_arrecadacao) |
| R$ 115,50 | 01/07/2026 | 04/06/2026, 11:48 | Analista Arrecadacao (analista_arrecadacao) |
| R$ 115,00 | 01/07/2026 | 10/06/2026, 16:48 | Analista Arrecadacao (analista_arrecadacao) |
| R$ 115,00 | 01/07/2026 | 10/06/2026, 16:48 | Analista Arrecadacao (analista_arrecadacao) |
| R$ 107,31 Vigente | 01/01/2026 | 06/05/2026, 18:49 | Sistema |

### Validação
| Critério | Esperado | Atual | Status |
|---|---|---|---|
| Tabela presente | Sim | Sim | ✅ |
| Seed aparece | Sim | Sim (última linha) | ✅ |
| `criadoPor = null` exibido | "Sistema" ou "—" | "Sistema" | ✅ |
| Erros no console | 0 | 0 | ✅ |

### Evidência
- Screenshot: `screenshots/ct02_historico_ui.png`
- Screenshot (pós-refresh): `screenshots/ct02_historico_ui_refreshed.png`

### Resultado
✅ **PASS**

---

## CT-03: Validar ordenação DESC

### Validação
- Registro 0: `dataVigencia = 2026-12-01` (maior)
- Registro 1: `dataVigencia = 2026-07-01`
- Registro 2: `dataVigencia = 2026-07-01`
- Registro 3: `dataVigencia = 2026-07-01`
- Registro 4: `dataVigencia = 2026-01-01` (menor)

### Comparação
```
2026-12-01 >= 2026-07-01 >= 2026-07-01 >= 2026-07-01 >= 2026-01-01
```
✅ Ordenação DESC por `dataVigencia` confirmada.

### Resultado
✅ **PASS**

---

## Observações

### ⚠️ Inconsistência detectada (não bloqueante para esta task)

Durante a execução, a API `GET /api/arrecadacao/v1/uda/vigente` retornou o registro seed (R$ 107,31, dataVigencia 2026-01-01) como vigente, mesmo existindo registros com dataVigencia futura no histórico (ex: R$ 130,00 para 2026-12-01). Isso pode indicar um problema na lógica de cálculo do "vigente" (se a regra é a maior dataVigencia <= data atual) ou a lógica está correta e os registros futuros não são considerados vigentes. Este comportamento é fora do escopo de **HU-02** (histórico) e deve ser investigado na task **qa_task_02** (UDA vigente) se ainda não foi validado.

### Nota sobre duplicação
O histórico contém dois registros com valor R$ 115,00 e dataVigencia 01/07/2026 criados em 10/06/2026. Isso indica que durante testes anteriores (qa_task_03) o ajustar UDA foi executado múltiplas vezes, o que é aceitável para ambiente de teste.

---

## Conclusão

| Métrica | Valor |
|---|---|
| Casos executados | 3 |
| Pass | 3 |
| Fail | 0 |
| Status geral | ✅ **PASS** |

A API e a UI apresentam o histórico de UDA corretamente, com ordenação DESC, campos completos e tratamento adequado para `criadoPor = null` (exibido como "Sistema"). Nenhum erro de console foi detectado.
