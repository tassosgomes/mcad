# Relatório de Teste QA — Task 03: Registrar Pagamento e Validar Verba (HU-01)

**Task ID:** qa_task_03_pagamento-e-verba
**Data:** 2026-06-08
**Tester:** QA Orchestrator
**Ambiente:** https://mcad.tasso.dev.br
**Usuário:** analista_arrecadacao

---

## Resultado: PASS

## Escopo
Validar que ao registrar um pagamento confirmado, a verba da rubrica+período é recalculada automaticamente, conforme RF-03 do PRD.

## Pré-condição
Criada nova licença "Bins, McClure and Jast — RADIO" (início 08/06/2026) para evitar conflito de pagamento existente.

## Cenários Testados

### 1. Registrar pagamento
- **Ação:** Acessar Pagamentos → Novo Pagamento → Selecionar "Bins, McClure and Jast — RADIO"
- **Preencher:** 10 UDAs (UDA vigente R$ 107,31)
- **Valor estimado:** R$ 1.073,10
- **Resultado:** Pagamento registrado com sucesso
- **Evidência:** `screenshots/formulario-novo-pagamento-preenchido.png`

### 2. Verificar recálculo da verba
- **Antes:** RADIO 06/2026 — Bruto R$ 714.796,20 | Líquida R$ 607.576,77 | 27 pagamentos
- **Depois:** RADIO 06/2026 — Bruto R$ 715.869,30 | Líquida R$ 608.488,90 | **28 pagamentos**
- **Diferença:** R$ 1.073,10 = 10 × R$ 107,31 ✅
- **Evidência:** `screenshots/verba-atualizada-apos-pagamento.png`

## Conclusão
O cálculo automático de verba ao registrar pagamento funciona corretamente. A verba foi incrementada com o valor do novo pagamento e a quantidade de pagamentos aumentou de 27 para 28.
