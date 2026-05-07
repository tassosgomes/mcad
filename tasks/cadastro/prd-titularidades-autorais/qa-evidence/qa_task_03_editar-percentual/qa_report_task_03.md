# QA Report — qa_task_03 — HU-03: Editar Percentual de uma Titularidade

**Data:** 2026-04-10
**Status:** PASS com divergencia
**Ambiente:** http://localhost:5001/api/v1

---

## Cenarios Executados

| # | Cenario | Esperado | Obtido | HTTP Esperado | HTTP Obtido | Status |
|---|---------|----------|--------|---------------|-------------|--------|
| T3-1 | PUT percentual valido (60->50) | 200 + soma atualizada | 200, percentual=50.0, soma atualizada de 128.3333 para 118.3333, somaCompleta=false | 200 | 200 | PASS |
| T3-2a | PUT percentual = 0 | 422 | 400, "'Percentual' must be greater than '0'." | 422 | 400 | DIVERGENCIA (semantica) |
| T3-2b | PUT percentual negativo | 422 | 400, "'Percentual' must be greater than '0'." | 422 | 400 | DIVERGENCIA (semantica) |
| T3-2c | PUT percentual > 100 | 422 | 400, "'Percentual' must be less than or equal to '100'." | 422 | 400 | DIVERGENCIA (semantica) |
| T3-3 | PUT titularidade inexistente | 404 | 404, "TitularidadeAutoral com ID '...' não foi encontrado" | 404 | 404 | PASS |
| T3-4 | DB: verificar percentual atualizado | Percentual=50.0000 | SELECT retornou Percentual=50.0000 | - | - | PASS |

---

## Banco de Dados (Validacao T3-4)

```
Id                                   | Percentual
822f5d8c-d3a3-40df-b659-f1ccfa808c1a | 50.0000
```

Percentual atualizado corretamente no banco.

---

## Divergencia Identificada

### DIV-02 (reiterar) — HTTP 400 em vez de 422 para validacao de percentual
Mesma divergencia documentada em qa_task_01. Validacao de negocio e correta, apenas codigo HTTP difere.

---

## Resultado: PASS com divergencia
Edicao de percentual funcional. RF-12, RF-13 (categoria nao alteravel — verificado pela ausencia de campo no body), RF-14 (soma recalculada) todos atendidos.
