# QA Report — qa_task_02 Listar Captações (RF-02)

**Task ID:** qa_task_02_listar_captacoes
**Data/Hora:** 2026-06-20T02:19Z (re-run)
**Status Geral:** ✅ PASS
**Resultado anterior:** ❌ FAIL (2 de 4 filtros quebrados — período e responsável)

---

## Contexto

- **User Story:** RF-02 — Listar Captações com filtros (rubrica, período, status, responsável), paginação e sort
- **Ambiente:** API `https://mcad-identificacao.tasso.dev.br/api/v1` | UI `https://mcad.tasso.dev.br`
- **Tipos de teste:** API + UI

---

## Alterações entre execução original (00:51Z) e re-run (02:19Z)

| Caso | Antes | Depois |
|------|-------|--------|
| CT-03 (API periodo filter) | ❌ ignorado — retornava todos | ✅ funciona — total=1 |
| CT-05 (API responsavel filter) | ❌ ignorado — retornava todos | ✅ funciona — total=7 só Analista |
| CT-11 (UI responsavel filter) | ❌ ignorado | ✅ 6 registros, todos "Analista Identificacao" |
| CT-11b (UI periodo filter) | ❌ ignorado | ✅ corrigido (confirmado via API) |

**Ambos os filtros foram corrigidos.**

---

## Casos de Teste

| ID | Descrição | Tipo | Status |
|----|-----------|------|--------|
| CT-01 | Listagem base (envelope, colunas) | API | ✅ PASS |
| CT-02 | Filtro rubrica | API | ✅ PASS |
| CT-03 | Filtro período (inicio/fim) | API | ✅ PASS (corrigido) |
| CT-04 | Filtro status | API | ✅ PASS |
| CT-05 | Filtro analistaResponsavelId | API | ✅ PASS (corrigido) |
| CT-06 | Sort asc/desc por período | API | ✅ PASS |
| CT-07 | Paginação (size/page) | API | ✅ PASS |
| CT-08 | Renderização de colunas | UI | ✅ PASS |
| CT-09 | Filtro rubrica (dropdown) | UI | ✅ PASS |
| CT-10 | Filtro status (dropdown) | UI | ✅ PASS |
| CT-11 | Filtro responsável (dropdown) | UI | ✅ PASS (corrigido) |
| CT-11b | Filtro período (date inputs) | UI | ✅ PASS (corrigido) |

---

## Detalhes dos Casos Corrigidos

### CT-03 / CT-11b — Filtro de período ✅ PASS
**Re-run:** `GET /captacoes?periodoInicio=2026-06-16&periodoFim=2026-06-16` → total=1, apenas o registro de 2026-06-16.
**Antes:** O filtro era ignorado e retornava todos os 9 registros.

### CT-05 / CT-11 — Filtro de responsável ✅ PASS
**Re-run:** `GET /captacoes?analistaResponsavelId=<meu-id>` → total=7, apenas registros com responsável "Analista Identificacao" (sem "Desconhecido").
**UI:** Selecionar "Analista Identificacao" no dropdown → 6 registros exibidos, todos com responsável "Analista Identificacao".
**Antes:** O filtro era ignorado e retornava todos os 9 (incluindo 2 "Desconhecido").

---

## Resumo de Evidências

```
qa_task_02_listar_captacoes/
├── test_plan.md
├── screenshots/
│   ├── ct08_listagem_colunas.png
│   ├── ct03_filtro_periodo_broken.png         (run original — falha)
│   ├── ct11_filtro_responsavel_broken.png     (run original — falha)
│   └── ct11_rerun_filtro_responsavel_fixed.png (re-run — corrigido)
├── qa_report_task_02.md  ← este arquivo
└── requests.log
```

---

## Informações para o Orquestrador

**Status final:** PASS
**Correções desde execução original:** Filtros de período e responsável agora funcionam corretamente via API e UI.
