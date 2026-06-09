# Relatório de Teste QA — Task 01: Visão Detalhada por Rubrica×Período (HU-03)

**Task ID:** qa_task_01_visao-detalhada
**Data:** 2026-06-08
**Tester:** QA Orchestrator
**Ambiente:** https://mcad.tasso.dev.br
**Usuário:** analista_arrecadacao

---

## Resultado: PASS

## Escopo
Validar a tela de acompanhamento de verbas na visão detalhada por rubrica×período, conforme RF-17 do PRD.

## Cenários Testados

### 1. Exibição inicial da tabela
- **Ação:** Acessar Arrecadação → Verbas
- **Resultado:** Tabela exibida com 8 linhas (8 rubricas × 1 período 06/2026)
- **Colunas presentes:** RUBRICA, PERÍODO, VALOR BRUTO, DED. ECAD, DED. ASSOC., VERBA LÍQUIDA, QTD PAG., STATUS, ATUALIZADO EM
- **Evidência:** `screenshots/tela-verbas-detalhada-inicial.png`

### 2. Cálculo da fórmula 85%
- **Dado:** TV_FECHADA 06/2026 com bruto R$ 988.680,30
- **Então:** ECAD = 988.680,30 × 0,10 = R$ 98.868,03 ✅
- **E:** Associações = 988.680,30 × 0,05 = R$ 49.434,01 ✅
- **E:** Líquida = 988.680,30 − 98.868,03 − 49.434,01 = R$ 840.378,26 ✅

### 3. Filtro por rubrica
- **Ação:** Selecionar "Rádio" no filtro de rubrica
- **Resultado:** Tabela exibe apenas 1 linha (RADIO)
- **Evidência:** `screenshots/filtro-radio-aplicado.png`

### 4. Limpar filtros
- **Ação:** Clicar em "Limpar filtros"
- **Resultado:** Tabela volta a exibir todas as 8 rubricas
- **Status:** ✅ Funcionando

## Conclusão
A visão detalhada está completa e funcional. Todos os requisitos de RF-17 atendidos.
