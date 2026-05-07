# QA Report — qa_task_03_desbloquear-obra

**Status:** PASS
**Data:** 2026-04-10
**Tipo:** API + DB

## User Story

Como analista, quero desbloquear uma obra BLOQUEADA, retornando-a ao status PENDENTE (não LIBERADO).

## Cenários Executados

### SC1 — Desbloquear obra BLOQUEADA
- **Resultado:** PASS
- POST /obras/4b0a0174.../desbloquear → HTTP 200
- Response: status=PENDENTE, bloqueioJustificativa=null

### SC2 — Verificar status é PENDENTE (não LIBERADO)
- **Resultado:** PASS
- GET /obras/{id} → status=PENDENTE (correto, não LIBERADO)

### SC3 — Desbloquear obra não-BLOQUEADA
- **Resultado:** PASS
- POST /desbloquear em obra PENDENTE → HTTP 422 "Apenas obras BLOQUEADAS podem ser desbloqueadas"

### SC4 — DB verify historico DESBLOQUEIO
- **Resultado:** PASS
- Tabela historico_bloqueios contém entradas: BLOQUEIO e DESBLOQUEIO para mesma EntidadeId
- Justificativa do DESBLOQUEIO é null (correto — desbloqueio não exige justificativa)

### SC5 — GET historico-bloqueios com ambas as entradas
- **Resultado:** PASS
- GET /obras/{id}/historico-bloqueios retorna array com:
  1. `{acao: "DESBLOQUEIO", justificativa: null, dataHora: "2026-04-11T03:42:41Z"}`
  2. `{acao: "BLOQUEIO", justificativa: "Conflito de titularidade pendente judicial", dataHora: "2026-04-11T03:41:55Z"}`
- Ordenação: mais recente primeiro (correto)

## Evidências DB

```sql
SELECT "Acao", "Justificativa", "DataHora" FROM cadastro.historico_bloqueios
WHERE "EntidadeId" = '4b0a0174-7882-4c79-9b86-d4f53d2a659f' ORDER BY "DataHora";
-- BLOQUEIO    | Conflito de titularidade pendente judicial | 2026-04-11T03:41:55
-- DESBLOQUEIO | null                                      | 2026-04-11T03:42:41
```

## Resultado Final

**PASS** — Todos os cenários passaram. Transição BLOQUEADO→PENDENTE funciona corretamente. Histórico registra BLOQUEIO e DESBLOQUEIO com timestamps corretos.
