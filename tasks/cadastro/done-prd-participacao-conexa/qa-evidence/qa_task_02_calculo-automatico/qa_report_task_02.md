# QA Report — qa_task_02: Cálculo Automático de Percentuais

**Data de execução:** 2026-04-11
**User Story:** HU-02 — Cálculo automático de percentuais por categoria
**Tipo:** API + DB
**Status final:** PASS

---

## Ambiente

- Base URL: http://localhost:5001/api/v1
- Fonogramas criados para teste:
  - QA-F01: `ff6075db-450e-4054-9832-0f7d21f42ae7` (1 INT + 1 PROD + 1 MUS)
  - QA-F02: `9621d31f-b672-4fa3-bbdb-344cf1345111` (1 INT + 1 PROD, sem músico)
  - QA-F03: `fd9a8166-6fe8-4c12-a676-7cef6266dcde` (2 INT + 1 PROD + 2 MUS)
  - QA-F04: `b55d0509-a837-4a9f-8ffd-3f3940a6a2e7` (1 INT + 1 PROD + 3 MUS, rounding)
  - QA-F05: `8acc36df-2f35-4c5d-8705-28a2a87e9d71` (só INTERPRETE)
  - QA-F06: `0b449bad-a04b-4f47-bc70-74935820266d` (só PRODUTOR)

---

## Cenários Executados

### Cenário 1 — POST /calcular: 1 INT + 1 PROD + 1 MUS
- **Fonograma:** QA-F01
- **HTTP esperado:** 200
- **HTTP obtido:** 200
- **Percentuais esperados:** INT=43.7000%, PROD=41.7000%, MUS=14.6000%
- **Percentuais obtidos (API):** INT=43.7, PROD=41.7, MUS=14.6 (truncagem de zeros à direita na exibição)
- **Percentuais no DB:** INT=43.7000, PROD=41.7000, MUS=14.6000 (4 casas decimais corretas)
- **somaPercentual:** 100.0
- **somaCalculada:** true
- **percentuaisDesatualizados:** false
- **PercentuaisDesatualizados DB:** false
- **Resultado:** PASS
- **Observação:** API serializa números sem zeros à direita (43.7 vs 43.7000), mas DB armazena corretamente com 4 decimais.

### Cenário 2 — POST /calcular: 1 INT + 1 PROD (sem músico)
- **Fonograma:** QA-F02
- **HTTP esperado:** 200
- **HTTP obtido:** 200
- **Percentuais esperados:** INT=50.0000%, PROD=50.0000%
- **Percentuais obtidos:** INT=50, PROD=50
- **somaPercentual:** 100
- **Resultado:** PASS

### Cenário 3 — POST /calcular: 2 INT + 1 PROD + 2 MUS (DUETO)
- **Fonograma:** QA-F03
- **HTTP esperado:** 200
- **HTTP obtido:** 200
- **Percentuais esperados:** cada INT=21.8500%, PROD=41.7000%, cada MUS=7.3000%
- **Percentuais obtidos:** cada INT=21.85, PROD=41.7, cada MUS=7.3
- **somaPercentual:** 100.00
- **Resultado:** PASS

### Cenário 4 — POST /calcular: 1 INT + 1 PROD + 3 MUS (ARREDONDAMENTO RN-12)
- **Fonograma:** QA-F04
- **HTTP esperado:** 200
- **HTTP obtido:** 200
- **Percentuais esperados:** INT=43.7000%, PROD=41.7000%, MUS1=4.8668%, MUS2=4.8666%, MUS3=4.8666%
- **Percentuais obtidos:**
  - INTERPRETE (Tasso Silva Gomes): 43.7
  - PRODUTOR_FONOGRAFICO (Editora de Teste): 41.7
  - MUSICO (Gomes Silva Tasso): **4.8668** (primeiro do grupo, recebeu o remainder)
  - MUSICO (QA PF Revalidado Final): 4.8666
  - MUSICO (Tasso Silva Gomes): 4.8666
- **somaPercentual:** 100.0000
- **RN-12 aplicada:** SIM — primeiro músico recebeu o remainder (4.8668 vs 4.8666)
- **Resultado:** PASS

### Cenário 5a — POST /calcular: apenas INTERPRETE (sem produtor) → 422
- **Fonograma:** QA-F05
- **HTTP esperado:** 422
- **HTTP obtido:** 422
- **Mensagem:** "Fonograma deve ter ao menos 1 Produtor Fonográfico"
- **Resultado:** PASS

### Cenário 5b — POST /calcular: apenas PRODUTOR (sem intérprete) → 422
- **Fonograma:** QA-F06
- **HTTP esperado:** 422
- **HTTP obtido:** 422
- **Mensagem:** "Fonograma deve ter ao menos 1 Intérprete"
- **Resultado:** PASS

---

## Resumo

| Cenário | Resultado |
|---------|-----------|
| 1 INT + 1 PROD + 1 MUS → 43.7/41.7/14.6 | PASS |
| DB: percentuais 4 casas decimais, PercentuaisDesatualizados=false | PASS |
| 1 INT + 1 PROD sem músico → 50/50 | PASS |
| 2 INT + 1 PROD + 2 MUS (dueto) → split correto | PASS |
| 1 INT + 1 PROD + 3 MUS → RN-12 arredondamento | PASS |
| Calcular sem PRODUTOR → 422 | PASS |
| Calcular sem INTÉRPRETE → 422 | PASS |

**Total: 7/7 cenários PASS (incluindo verificação DB)**

---

## Observações

- A API serializa percentuais sem zeros à direita desnecessários (ex: `43.7` em vez de `43.7000`), mas o banco de dados armazena com precisão de 4 casas decimais conforme RN-12.
- O campo `somaPercentual` exibe em formatos variados dependendo do cenário (100.0, 100, 100.00, 100.0000), mas o valor é sempre 100% exato.
