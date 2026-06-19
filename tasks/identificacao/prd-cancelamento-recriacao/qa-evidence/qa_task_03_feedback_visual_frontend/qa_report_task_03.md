# QA Report — qa_task_03: Feedback Visual

**Data:** 2026-06-18  
**Status:** BLOCKED  
**Depende de:** qa_task_01_cancelar_rol_fechado (Cenário 3 — cancelamento com sucesso)

---

## Motivo do Bloqueio

Esta task depende da existência de uma captação CANCELADA (cenários 1 e 2) e da flag `distribuicaoProcessada = true` (cenário 3). Nenhuma dessas condições está presente no ambiente.

## Cenários

| # | Cenário | Status | Observação |
|---|---------|--------|------------|
| 1 | Banner na captação CANCELADA | BLOCKED | Nenhuma captação CANCELADA no ambiente |
| 2 | Toast de sucesso após cancelamento | BLOCKED | Requer cancelamento bem-sucedido |
| 3 | Botão desabilitado com tooltip | BLOCKED | Nenhuma captação com `distribuicaoProcessada = true`. O endpoint `pode-cancelar` retorna o campo `motivo` (ex: "Apenas captações FECHADAS podem ser canceladas.") que o frontend usaria como tooltip, mas não há captação com `distribuicaoProcessada = true` para testar o tooltip específico "Rol já processado pela Distribuição". |

## Observação Parcial (Cenário 3)

O campo `motivo` no response de `pode-cancelar` está presente e populado. Quando uma captação tiver `distribuicaoProcessada = true`, o motivo "Este Rol já foi processado pela Distribuição" deve ser exibido como tooltip. Esta lógica depende da UI `CancelarRolButton` renderizar o tooltip — o que não pôde ser verificado sem dados.

## Pré-requisitos para Reexecução

1. Captação CANCELADA com `justificativaCancelamento` populada (para cenário 1)
2. Captação FECHADA para efetuar cancelamento via UI (para cenário 2)
3. Captação FECHADA com `distribuicaoProcessada = true` (para cenário 3)
