# Relatório Consolidado de Testes QA
## F05: Cálculo e Disponibilização de Verba Líquida

**PRD:** tasks/arrecadacao/prd-calculo-verba-liquida/prd.md  
**Tech Spec:** tasks/arrecadacao/prd-calculo-verba-liquida/techspec.md  
**Ambiente:** https://mcad.tasso.dev.br  
**Data:** 2026-06-08  
**Tester:** QA Orchestrator  
**Usuário:** analista_arrecadacao  

---

## Sumário Executivo

| Task | User Story | Status |
|------|-----------|--------|
| qa_task_01 | HU-03 — Visão detalhada por rubrica×período | **PASS** |
| qa_task_02 | HU-04 — Visão agregada com drill-down | **PASS** |
| qa_task_03 | HU-01 — Cálculo automático ao registrar pagamento | **PASS** |
| qa_task_04 | HU-02 — Recálculo automático ao estornar pagamento | **PASS** |
| qa_task_05 | HU-05 — Badge de status ABERTA | **PASS** |

**Resultado geral: 5/5 tasks PASS**

---

## Detalhamento por Task

### Task 01 — Visão Detalhada (HU-03) ✅
- Tabela exibe todas as colunas conforme RF-17
- Filtros por rubrica, período e status funcionam
- Cálculo 85% validado: bruto × 0,85 = líquida (com deduções ECAD 10% + Associações 5%)

### Task 02 — Visão Agregada (HU-04) ✅
- Toggle entre visões detalhada/agregada funciona
- Totais acumulados por rubrica corretos
- Drill-down expande mostrando períodos individuais

### Task 03 — Pagamento e Verba (HU-01) ✅
- Nova licença criada para evitar conflito de pagamento existente
- Pagamento de 10 UDAs (R$ 1.073,10) registrado com sucesso
- Verba RADIO recalculada: +R$ 1.073,10 no bruto, +1 pagamento

### Task 04 — Estorno e Verba (HU-02) ✅
- Pagamento estornado com sucesso (modal com justificativa)
- Verba RADIO recalculada: -R$ 1.073,10 no bruto, -1 pagamento
- Valor voltou exatamente ao original (R$ 714.796,20)

### Task 05 — Status ABERTA (HU-05) ✅
- Status "Aberta" visível em todas as verbas
- Cenários de lock EM_DISTRIBUICAO/DISTRIBUIDA **fora de escopo** (D04 não publica eventos)

---

## Evidências

```
qa-evidence/
├── qa_task_01_visao-detalhada/
│   ├── screenshots/
│   │   ├── tela-verbas-detalhada-inicial.png
│   │   └── filtro-radio-aplicado.png
│   └── qa_report_task_01.md
├── qa_task_02_visao-agregada/
│   ├── screenshots/
│   │   ├── visao-agregada-inicial.png
│   │   └── drill-down-cinema-expandido.png
│   └── qa_report_task_02.md
├── qa_task_03_pagamento-e-verba/
│   ├── screenshots/
│   │   ├── formulario-novo-pagamento-preenchido.png
│   │   └── verba-atualizada-apos-pagamento.png
│   └── qa_report_task_03.md
├── qa_task_04_estorno-e-verba/
│   ├── screenshots/
│   │   └── verba-recalculada-apos-estorno.png
│   └── qa_report_task_04.md
├── qa_task_05_badge-status/
│   ├── screenshots/
│   │   └── badge-aberta-visivel.png
│   └── qa_report_task_05.md
└── qa_report_consolidado.md
```

---

## Recomendações

1. **Lock de Distribuição (RF-13/14/15):** Aguardar implementação do D04 para testar ciclos de status EM_DISTRIBUICAO → DISTRIBUIDA.
2. **Teste de concorrência:** Validar comportamento quando dois pagamentos simultâneos tentam alterar a mesma verba (lock pessimista).
3. **Verba zerada:** Testar cenário onde todos os pagamentos de uma rubrica+período são estornados (verba deve permanecer com R$ 0,00, não ser excluída).

---

*Relatório gerado pelo QA Orchestrator v1.0*
