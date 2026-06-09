# Relatório de Teste QA — Task 02: Visão Agregada por Rubrica com Drill-Down (HU-04)

**Task ID:** qa_task_02_visao-agregada
**Data:** 2026-06-08
**Tester:** QA Orchestrator
**Ambiente:** https://mcad.tasso.dev.br
**Usuário:** analista_arrecadacao

---

## Resultado: PASS

## Escopo
Validar a visão agregada por rubrica com drill-down para períodos individuais, conforme RF-18 do PRD.

## Cenários Testados

### 1. Exibição da visão agregada
- **Ação:** Clicar em "Por Rubrica (Agregado)"
- **Resultado:** Tabela exibe 8 rubricas com totais acumulados
- **Colunas presentes:** RUBRICA, BRUTO TOTAL, LÍQUIDA TOTAL, PERÍODOS
- **Evidência:** `screenshots/visao-agregada-inicial.png`

### 2. Validação de cálculo agregado
- **Dado:** CINEMA tem apenas período 06/2026
- **Quando:** Bruto total = R$ 1.076.586,50
- **Então:** Líquida total = R$ 915.098,52 (85% do bruto) ✅

### 3. Drill-down (expansão)
- **Ação:** Clicar na linha "CINEMA Cinema"
- **Resultado:** Expande mostrando período 2026-06 com bruto R$ 1.076.586,50 e líquida R$ 915.098,52
- **Status:** "Aberta" visível na linha expandida
- **Evidência:** `screenshots/drill-down-cinema-expandido.png`

## Conclusão
Visão agregada e drill-down funcionando conforme especificado em RF-18.
