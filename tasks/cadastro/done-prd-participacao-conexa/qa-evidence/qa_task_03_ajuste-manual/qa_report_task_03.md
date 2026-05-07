# QA Report — qa_task_03: Ajuste Manual de Percentuais

**Data de execução:** 2026-04-11
**User Story:** HU-03 — Ajuste manual de percentual de intérprete/produtor
**Tipo:** API
**Status final:** PASS

---

## Ambiente

- Base URL: http://localhost:5001/api/v1
- Fonograma usado: QA-F03 `fd9a8166-6fe8-4c12-a676-7cef6266dcde` (2 INT + 1 PROD + 2 MUS, já calculado)
- IDs das participações:
  - INT1 (Gomes Silva Tasso): `ad13afd9-4aa2-4405-b6ae-8d631b483a12`
  - INT2 (Tasso Silva Gomes): `23039c72-1471-4445-b3a4-abab587d1159`
  - PROD (Editora de Teste): `83a47a4b-2ca0-4c18-a9f8-02a6aaba0aec`
  - MUS1 (Gomes Silva Tasso): `8c64c878-f8c3-45cb-932f-c08be2a269a0`
  - MUS2 (Tasso Silva Gomes): `bd4dff14-fc1f-4423-8d5e-59fd287329df`

---

## Cenários Executados

### Cenário 1 — PUT INT1 percentual=30.0000
- **Ação:** PUT /api/v1/fonogramas/{id}/participacoes/{INT1_ID} com {percentual: 30.0000}
- **HTTP esperado:** 200
- **HTTP obtido:** 200
- **Percentual atualizado:** 30.0000
- **editavel:** true (confirmado)
- **Resultado:** PASS

### Cenário 2 — PUT INT2 percentual=13.7000 (soma intérpretes = 43.7%)
- **Ação:** PUT /api/v1/fonogramas/{id}/participacoes/{INT2_ID} com {percentual: 13.7000}
- **HTTP esperado:** 200
- **HTTP obtido:** 200
- **Percentual atualizado:** 13.7000
- **Resultado:** PASS

### Cenário 3 — PUT PRODUTOR percentual=41.7000
- **Ação:** PUT /api/v1/fonogramas/{id}/participacoes/{PROD_ID} com {percentual: 41.7000}
- **HTTP esperado:** 200
- **HTTP obtido:** 200
- **Percentual atualizado:** 41.7000
- **Resultado:** PASS

### Cenário 4 — PUT MUSICO percentual=10.0000 → 422 (não editável)
- **Ação:** PUT /api/v1/fonogramas/{id}/participacoes/{MUS1_ID} com {percentual: 10.0000}
- **HTTP esperado:** 422
- **HTTP obtido:** 422
- **Mensagem:** "Percentual de Músico Executante não pode ser editado manualmente"
- **Resultado:** PASS

### Cenário 5 — Verificar flags editavel em GET
- **Ação:** GET /api/v1/fonogramas/{id}/participacoes
- **HTTP esperado:** 200
- **HTTP obtido:** 200
- **INTERPRETE editavel:** true (para ambos intérpretes)
- **PRODUTOR_FONOGRAFICO editavel:** true
- **MUSICO_EXECUTANTE editavel:** false (para ambos músicos)
- **Resultado:** PASS

---

## Resumo

| Cenário | Resultado |
|---------|-----------|
| PUT INTERPRETE → 200, percentual atualizado | PASS |
| PUT INTERPRETE 2 → 200 | PASS |
| PUT PRODUTOR → 200 | PASS |
| PUT MUSICO → 422 (não editável) | PASS |
| GET: editavel=false para músico, true para INT/PROD | PASS |

**Total: 5/5 PASS**
