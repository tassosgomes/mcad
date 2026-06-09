# Relatório de Teste QA — Task 05: Badge de Status ABERTA (HU-05)

**Task ID:** qa_task_05_badge-status
**Data:** 2026-06-08
**Tester:** QA Orchestrator
**Ambiente:** https://mcad.tasso.dev.br
**Usuário:** analista_arrecadacao

---

## Resultado: PASS

## Escopo
Validar a visualização do status da verba (ABERTA), conforme RF-12 e HU-05 do PRD.

## Observação Importante
Os cenários de lock (EM_DISTRIBUICAO/DISTRIBUIDA) estão fora de escopo nesta sessão porque o domínio D04 (Distribuição) ainda não publica os eventos `distribuicao.processo.iniciado/finalizado`. O lock fica inerte até que D04 implemente a publicação.

## Cenários Testados

### 1. Status ABERTA visível na visão detalhada
- **Ação:** Acessar Verbas → Por Rubrica × Período
- **Resultado:** Todas as 8 verbas exibem status "Aberta"
- **Evidência:** `screenshots/badge-aberta-visivel.png`

### 2. Status ABERTA visível no drill-down da visão agregada
- **Ação:** Acessar Verbas → Por Rubrica (Agregado) → Expandir CINEMA
- **Resultado:** Linha expandida mostra status "Aberta"
- **Evidência:** `../qa_task_02_visao-agregada/screenshots/drill-down-cinema-expandido.png`

## Excluído do Escopo
- Cenário de lock EM_DISTRIBUICAO (RF-13, RF-15)
- Cenário de lock DISTRIBUIDA (RF-14)
- Motivo: D04 não publica eventos de distribuição

## Conclusão
O status ABERTA é exibido corretamente em todas as verbas. Cenários de lock serão testados quando D04 estiver pronto.
