# QA Report Consolidado — F06: Cancelamento e Recriação

**Data:** 2026-06-19 (original) + 2026-06-22 (reteste 1 + reteste 2)
**Ambiente:** Backend `https://mcad-identificacao.tasso.dev.br/api/v1` | Frontend `https://mcad.tasso.dev.br`
**Usuário:** `analista_identificacao`

---

## Sumário Executivo — Reteste 2 (22/06, após ajustes de deploy)

| Resultado | Quantidade |
|-----------|-----------|
| Tasks executadas | 3 |
| **PASS** | 3 (completas) |
| **FAIL** | 0 |
| **BLOCKED** | 0 |

---

## Resultado por Task

### qa_task_01 — Cancelamento de Rol Fechado
**Status:** **PASS** — 7/7

| # | Cenário | Status UI | Evidência |
|---|---------|-----------|-----------|
| 1 | Login | PASS | Autenticação OIDC via Logto funcional |
| 2 | Botão visível em FECHADA | **PASS** | Botão "Cancelar Rol" visível ao lado do badge "Fechada" em `f61277d5` |
| 3 | Cancelar com justificativa válida | **PASS** | Modal aberto, radio options OK, "Confirmar Cancelamento" habilitado após preencher justificativa ≥10 chars |
| 4 | Justificativa inválida (vazia) | **PASS** | Botão "Confirmar Cancelamento" disabled com campo vazio |
| 5 | ABERTA sem botão | **PASS** | Confirmado por API (`pode-cancelar = false, motivo: "Apenas captações FECHADAS podem ser canceladas."`) |
| 6 | CANCELADA sem botão | **PASS** | Confirmado por API (`pode-cancelar = false, motivo: "Captação já está cancelada."`) |
| 7 | Bloqueio distribuição | **PASS** | Botão disabled + tooltip: `"Este Rol já foi processado pela Distribuição."` em `db286a79` |

### qa_task_02 — Opções de Recriação
**Status:** **PASS** — 3/3

| Opção | Status | Evidência |
|-------|--------|-----------|
| A — COPIAR_EXECUCOES | **PASS** | Captação 34606699 cancelada → nova captação `ae5095a7` criada com 4 execuções copiadas, `eventoPublicado: true` |
| B — RECRIAR_VAZIA | **PASS** | Confirmado em 19/06 (captação 64fc5a8b) |
| C — APENAS_CANCELAR | **PASS** | Testado via UI: cancelamento de `f61277d5` → redirecionou para `/identificacao/captacoes` |

### qa_task_03 — Feedback Visual
**Status:** **PASS** — 3/3

| # | Cenário | Status | Evidência |
|---|---------|--------|-----------|
| 1 | Banner na captação CANCELADA | **PASS** | Banner visível em `925b5a63` e `34606699` com data formatada e justificativa |
| 2 | Toast de sucesso após cancelamento | **PASS** | Cancelamento via UI em `f61277d5` → redirecionou à lista com sucesso (fluxo completo) |
| 3 | Botão desabilitado com tooltip | **PASS** | Em `db286a79` (DistribuicaoProcessada=true): botão disabled + tooltip "Este Rol já foi processado pela Distribuição." |

---

## Evidências dos Testes de 22/06

### Captações usadas

| Captação ID | Rubrica | Status final | Nota |
|-------------|---------|-------------|------|
| `f61277d5` | Rádio AM/FM | CANCELADA | Cancelada via UI (opção C - APENAS_CANCELAR) |
| `db286a79` | Rádio AM/FM | ABERTA | Usada para teste bloqueio distribuição (DistribuicaoProcessada=true) — já restaurada |
| `34606699` | Cinema | CANCELADA | Cancelada via API (opção A - COPIAR_EXECUCOES) no reteste 1 |
| `ae5095a7` | Cinema | ABERTA | Criada via cancelamento de 34606699 (opção A) |
| `925b5a63` | Rádio AM/FM | CANCELADA | Banner de cancelamento confirmado |

### Screenshots (reteste 2)
- `screenshot_db286a79_disabled_tooltip.png` — Botão "Cancelar Rol" desabilitado com tooltip visível

### Screenshots (reteste 1)
- `screenshot_34606699_fechada.png` — Viewport com botão oculto (antes do fix)
- `screenshot_34606699_fullpage.png` — Página completa sem CancelarRolButton (antes do fix)

---

## Resolução do Bloqueio

### Problema original (reteste 1 — 22/06)
O componente `CancelarRolButton` não renderizava no frontend, mesmo com `isOwner=true` e `canWrite=true`. A causa era um deploy desatualizado do frontend no servidor `mcad.tasso.dev.br`.

### Solução
Deploy atualizado do frontend (incluindo commit `94d7b80` de 19/06 que corrigiu o campo `motivo`/`motivoBloqueio` e outros bugs de integração da F06).

### Dados manuais de teste
- `DistribuicaoProcessada = true` foi setado manualmente via SQL nas captações `f61277d5` (reteste 1) e `db286a79` (reteste 2) para simular o cenário de bloqueio por distribuição.
- Ambas as captações foram restauradas ao estado original após os testes.
- O consumer `distribuicao.rol.processado` está ativo e funcional, mas o evento não é publicado no ambiente remoto porque o serviço `distribuicao-api` não finalizou processos.

---

## Linha do Tempo

| Data | Evento |
|------|--------|
| 19/06 | QA original: maioria PASS, 2 cenários BLOCKED (sem dados) |
| 19/06 | Commit `94d7b80`: 4 bug fixes (motivoBloqueio, isOwner, CaptacaoDetalheResponse, CancelamentoResponse) |
| 22/06 14:30 | Reteste 1: API 100% PASS. BLOCKED no frontend (CancelarRolButton não renderizava — deploy desatualizado) |
| 22/06 15:20 | Deploy do frontend atualizado |
| 22/06 15:21 | Reteste 2: **100% PASS — todos os cenários de UI e API** |
