# QA Report — qa_task_07_bloquear-desbloquear-fonograma

**Status:** PASS
**Data:** 2026-04-10
**Tipo:** API + DB

## User Story

Como analista, quero bloquear/desbloquear fonogramas, com registro no histórico de bloqueios.

## Cenários Executados

### SC1 — Bloquear fonograma PENDENTE_VALIDACAO com justificativa
- **Resultado:** PASS
- POST /fonogramas/8b860050.../bloquear com justificativa "Contrato de gravação em disputa judicial"
- HTTP 200, status=BLOQUEADO
- Response inclui urlAudio corretamente (nota: o response de bloquear retorna urlAudio, ao contrário do GET)

### SC2 — Bloquear fonograma LIBERADO
- **Resultado:** PASS
- POST /fonogramas/271647ce.../bloquear (fonograma LIBERADO) → HTTP 200, status=BLOQUEADO

### SC3 — Bloquear com justificativa curta (< 10 chars)
- **Resultado:** PASS
- POST /bloquear com justificativa="curta" → HTTP 400
- errors.Justificativa: ["Justificativa deve ter no mínimo 10 caracteres."]

### SC4 — Desbloquear fonograma → PENDENTE_VALIDACAO
- **Resultado:** PASS
- POST /fonogramas/8b860050.../desbloquear → HTTP 200
- status=PENDENTE_VALIDACAO (correto: fonograma retorna ao início do ciclo)

### SC5 — GET historico-bloqueios fonograma
- **Resultado:** PASS
- GET /fonogramas/{id}/historico-bloqueios retorna array com:
  1. `{acao: "DESBLOQUEIO", justificativa: null, dataHora: "2026-04-11T03:43:30Z"}`
  2. `{acao: "BLOQUEIO", justificativa: "Contrato de gravação em disputa judicial", dataHora: "2026-04-11T03:43:19Z"}`

### SC6 — DB verify historico EntidadeTipo=FONOGRAMA
- **Resultado:** PASS
- Tabela historico_bloqueios contém 3 entradas com EntidadeTipo='FONOGRAMA':
  - DESBLOQUEIO para 8b860050 em 03:43:30
  - BLOQUEIO para 271647ce em 03:43:30 (Violação de contrato de exclusividade)
  - BLOQUEIO para 8b860050 em 03:43:19 (Contrato de gravação em disputa judicial)

## Evidências DB

```sql
SELECT "EntidadeTipo", "EntidadeId", "Acao", "Justificativa", "DataHora"
FROM cadastro.historico_bloqueios WHERE "EntidadeTipo" = 'FONOGRAMA'
ORDER BY "DataHora" DESC LIMIT 5;
-- FONOGRAMA | 8b860050 | DESBLOQUEIO | null                                       | 2026-04-11T03:43:30
-- FONOGRAMA | 271647ce | BLOQUEIO    | Violação de contrato de exclusividade      | 2026-04-11T03:43:30
-- FONOGRAMA | 8b860050 | BLOQUEIO    | Contrato de gravação em disputa judicial   | 2026-04-11T03:43:19
```

## Resultado Final

**PASS** — Todos os cenários passaram. Bloquear/desbloquear fonogramas funciona corretamente, com registro no histórico de bloqueios.
