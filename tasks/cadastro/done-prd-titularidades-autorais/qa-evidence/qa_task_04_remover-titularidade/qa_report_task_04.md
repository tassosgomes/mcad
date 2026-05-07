# QA Report — qa_task_04 — HU-04: Remover Titular Autoral de uma Obra

**Data:** 2026-04-10
**Status:** PASS
**Ambiente:** http://localhost:5001/api/v1

---

## Cenarios Executados

| # | Cenario | Esperado | Obtido | HTTP Esperado | HTTP Obtido | Status |
|---|---------|----------|--------|---------------|-------------|--------|
| T4-1 | DELETE titularidade existente | 200 com body (lista + soma) | 200, body com lista atualizada (3 itens), somaPercentual=68.3333, somaCompleta=false | 200 | 200 | PASS |
| T4-2 | DELETE titularidade inexistente | 404 | 404, "TitularidadeAutoral com ID '...' não foi encontrado" | 404 | 404 | PASS |
| T4-3 | Remover todas as titularidades | soma=0, lista vazia | Apos remover as 3 restantes: somaPercentual=0, titularidades=[], somaCompleta=false | - | 200 | PASS |
| T4-4 | DB: confirmar remocao | 0 registros para a obra | SELECT COUNT(*) = 0 confirmado | - | - | PASS |

---

## Detalhe T4-1 — Response do DELETE com Body

O endpoint DELETE retorna o estado atualizado das titularidades da obra, incluindo:
- `obraId`
- `titularidades` (lista atualizada)
- `somaPercentual` (recalculada)
- `somaCompleta` (booleano)

Este comportamento atende RF-15, RF-16, RF-17.

---

## Banco de Dados (Validacao T4-4)

```sql
SELECT COUNT(*) as total FROM cadastro.titularidades_autorais WHERE "ObraId" = '9883b3f3-...'
-- Resultado: 0 registros
```

---

## Resultado: PASS
Todos os cenarios de remocao passaram. RF-15 (remover), RF-16 (soma recalculada), RF-17 (soma 0% quando vazia) todos atendidos.
