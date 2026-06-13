# QA Report — HU-04: Listar pagamentos

**Task ID:** qa_task_06_listar_pagamentos
**Data/Hora:** 2026-06-11T00:00:47.470Z
**Status Geral:** ✅ PASS

---

## Contexto

- **User Story:** HU-04 — Consultar pagamentos
- **Ambiente:** https://mcad.tasso.dev.br
- **Tipos de teste:** API (cURL via fetch) + UI (Playwright)
- **Autenticação:** LogTo Bearer token
- **Credenciais:** analista_arrecadacao / Analista123!
- **Pagamento de referência:** fa24bdf6-6832-4668-a691-1ee3e298b14d (criado na task 05)

---

## Casos de Teste

| ID | Descricao | Tipo | Status |
|----|-----------|------|--------|
| CT-01 | Listar pagamentos sem filtros | API | ✅ PASS |
| CT-02 | Paginação | API | ✅ PASS |
| CT-03 | Filtro por período | API | ✅ PASS |
| CT-04 | Filtro por status | API | ✅ PASS |
| CT-05 | Filtro por razaoSocial | API | ✅ PASS |
| CT-06 | Filtro combinado | API | ✅ PASS |
| CT-07 | Listar pagamentos via UI | UI | ✅ PASS |
| CT-08 | Aplicar filtro no UI | UI | ✅ PASS |

---

## Detalhes por Caso

### CT-01 — Listar pagamentos sem filtros ✅ PASS

**Expected:** 200 com items array e metadata object
**Actual:** Status 200, body: {"items":[{"id":"d7564d86-871f-40e1-a5f6-29d96dc7e5f5","licenca":{"id":"2b6aa565-d371-440d-9b8e-a68f7698f61c","status":"ATIVA","usuarioMusica":{"id":"321bcae8-3c1c-4e69-8c78-8c6c74a113bf","razaoSocial":"Dibbert - Howell","cnpjFormatado":"39.526.756/7945-85"},"rubrica":{"id":"e5f6a7b8-c9d0-1234-efab-
**Notas:** totalElements=255, size=20

### CT-02 — Paginação ✅ PASS

**Expected:** page=1 size=10 tem totalElements>=1; page=2 retorna 200
**Actual:** CT-02a: 200, CT-02b: 200
**Notas:** totalElements=255, totalPages=26

### CT-03 — Filtro por período ✅ PASS

**Expected:** 200, todos os itens têm periodo=2026-06
**Actual:** Status 200, items=20
**Notas:** allMatch=true

### CT-04 — Filtro por status ✅ PASS

**Expected:** 200, todos os itens têm status=CONFIRMADO
**Actual:** Status 200, items=20
**Notas:** allMatch=true

### CT-05 — Filtro por razaoSocial ✅ PASS

**Expected:** 200, pelo menos 1 item com razaoSocial contendo "Bossa"
**Actual:** Status 200, items=1
**Notas:** hasMatch=true

### CT-06 — Filtro combinado ✅ PASS

**Expected:** 200, todos os itens têm periodo=2026-06 E status=CONFIRMADO
**Actual:** Status 200, items=20
**Notas:** allMatch=true

### CT-07 — Listar pagamentos via UI ✅ PASS

**Expected:** Tabela renderizada com dados, paginação visível
**Actual:** hasTable=true, hasPagamento=true
**Notas:** Screenshot: ct07_listar_pagamentos_ui.png

### CT-08 — Aplicar filtro no UI ✅ PASS

**Expected:** Tabela atualiza com filtro aplicado
**Actual:** hasFilteredData=true
**Notas:** Screenshot: ct08_filtro_ui.png

---

## Resumo de Evidências

```
qa_task_06_listar_pagamentos/
├── logs/
│   └── requests.log
├── screenshots/
│   ├── ct07_listar_pagamentos_ui.png
│   └── ct08_filtro_ui.png
└── qa_report_task_06.md
```

---

## Status Final

**Status:** ✅ PASS

**Resultados:**
- CT-01: ✅ PASS — Listar pagamentos sem filtros
- CT-02: ✅ PASS — Paginação
- CT-03: ✅ PASS — Filtro por período
- CT-04: ✅ PASS — Filtro por status
- CT-05: ✅ PASS — Filtro por razaoSocial
- CT-06: ✅ PASS — Filtro combinado
- CT-07: ✅ PASS — Listar pagamentos via UI
- CT-08: ✅ PASS — Aplicar filtro no UI
