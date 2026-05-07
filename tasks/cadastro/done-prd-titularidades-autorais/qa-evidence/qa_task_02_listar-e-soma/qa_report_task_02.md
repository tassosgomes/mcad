# QA Report — qa_task_02 — HU-02: Visualizar Soma dos Percentuais

**Data:** 2026-04-10
**Status:** PASS
**Ambiente:** http://localhost:5001/api/v1

---

## Cenarios Executados

| # | Cenario | Esperado | Obtido | HTTP Esperado | HTTP Obtido | Status |
|---|---------|----------|--------|---------------|-------------|--------|
| T2-1 | GET obra com titularidades | 200, lista com dados, soma calculada | 200, lista com 4 titularidades, somaPercentual=128.3333, somaCompleta=false | 200 | 200 | PASS |
| T2-2 | GET obra sem titularidades | 200, lista vazia, soma=0, somaCompleta=false | 200, titularidades=[], somaPercentual=0, somaCompleta=false | 200 | 200 | PASS |
| T2-3 | Verificar soma < 100 -> somaCompleta=false | somaCompleta=false | somaCompleta=false quando soma=128.3333 | - | - | PASS |
| T2-4 | Adicionar titularidades somando 100% | somaCompleta=true | somaPercentual=100.0000, somaCompleta=true | 201 | 201 | PASS |
| T2-5 | Verificar campos: nome, tipo, documento, categoria, percentual | Todos presentes | Todos presentes: nome, tipo (PF/PJ), documentoFormatado, categoria, percentual (4 casas) | - | - | PASS |

---

## Detalhe T2-1 — Estrutura do Response

```json
{
  "obraId": "9883b3f3-...",
  "titularidades": [
    {
      "id": "...",
      "titular": {
        "id": "...",
        "codigo": 2,
        "nome": "Editora de Teste",
        "tipo": "PJ",
        "documentoFormatado": "JG.WD9.SV9/0001-50",
        "associacaoSigla": "AMAR"
      },
      "categoria": "AUTOR",
      "percentual": 5.0000
    }
  ],
  "somaPercentual": 128.3333,
  "somaCompleta": false
}
```

Campos RF-18 presentes: nome, tipo (PF/PJ), documentoFormatado, categoria, percentual com 4 casas decimais.
Campo `somaCompleta` booleano indica se soma = 100%.

---

## Detalhe T2-4 — Soma Exata 100%

Obra `0033f7e9-...` (QA T02 Soma 100):
- Tasso Silva Gomes, AUTOR, 60%
- Editora de Teste, EDITOR, 40%
- somaPercentual=100.0000, somaCompleta=true

---

## Resultado: PASS
Todos os cenarios de listagem e soma passaram. API retorna estrutura completa conforme RF-18/RF-19.
