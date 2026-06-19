# QA Report — qa_task_02: Opções de Recriação

**Data:** 2026-06-18  
**Status:** BLOCKED  
**Depende de:** qa_task_01_cancelar_rol_fechado (Cenário 3 — cancelamento com sucesso)

---

## Motivo do Bloqueio

Esta task depende da criação de uma captação CANCELADA via qa_task_01. Como não foi possível cancelar uma captação (ausência de captações FECHADAS no ambiente), todos os cenários desta task ficam bloqueados.

## Cenários Bloqueados

| # | Cenário | Pré-condição faltante |
|---|---------|----------------------|
| 1 | Opção A — Copiar execuções | Captação cancelada com sucesso + execuções existentes |
| 2 | Opção B — Recriar vazia | Captação cancelada com sucesso |
| 3 | Opção C — Apenas cancelar | Captação cancelada com sucesso |

## Pré-requisitos para Reexecução

1. Existir ao menos 1 captação FECHADA no ambiente
2. O analista logado deve ser o dono da captação
3. A captação deve ter `distribuicaoProcessada = false`
4. Para Opção A: a captação original deve ter execuções registradas

## APIs Verificadas (endpoints existem)

Os endpoints `pode-cancelar` e `cancelar` estão operacionais e respondem corretamente. O endpoint `cancelar` aceita o campo `opcaoRecriacao` com valores `COPIAR_EXECUCOES`, `RECRIAR_VAZIA`, `APENAS_CANCELAR` — confirmado via contrato do endpoint testado em qa_task_01.
