# Relatório de Teste QA — Task 04: Estornar Pagamento e Validar Recálculo (HU-02)

**Task ID:** qa_task_04_estorno-e-verba
**Data:** 2026-06-08
**Tester:** QA Orchestrator
**Ambiente:** https://mcad.tasso.dev.br
**Usuário:** analista_arrecadacao

---

## Resultado: PASS

## Escopo
Validar que ao estornar um pagamento, a verba da rubrica+período é recalculada subtraindo o valor estornado, conforme RF-04 do PRD.

## Cenários Testados

### 1. Estornar pagamento
- **Ação:** Acessar detalhes do pagamento #5A10953C (Bins, McClure and Jast — RADIO)
- **Clicar:** "Estornar Pagamento"
- **Preencher motivo:** "Teste QA - estorno de pagamento"
- **Resultado:** Pagamento estornado com sucesso. Status alterado para "Estornado"
- **Evidência:** Página de detalhes mostra Status = Estornado

### 2. Verificar recálculo da verba após estorno
- **Antes do estorno:** RADIO 06/2026 — Bruto R$ 715.869,30 | Líquida R$ 608.488,90 | 28 pagamentos
- **Após estorno:** RADIO 06/2026 — Bruto R$ 714.796,20 | Líquida R$ 607.576,77 | **27 pagamentos**
- **Diferença:** R$ 1.073,10 subtraído corretamente ✅
- **Evidência:** `screenshots/verba-recalculada-apos-estorno.png`

### 3. Verba permanece com valor zero (se aplicável)
- **Nota:** Como havia outros 27 pagamentos confirmados, a verba não zerou
- **Validação:** A verba voltou exatamente ao valor original (antes do pagamento de teste)

## Conclusão
O recálculo automático de verba ao estornar pagamento funciona corretamente. O valor estornado foi subtraído e a quantidade de pagamentos voltou de 28 para 27.
