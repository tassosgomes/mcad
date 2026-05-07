# Relatório Consolidado de Testes QA — F06: Participação Conexa Automática

**Data de execução:** 2026-04-11
**Feature:** F06 — Participação Conexa Automática (Percentuais por Categoria)
**PRD:** tasks/cadastro/prd-participacao-conexa/prd.md
**Techspec:** tasks/cadastro/prd-participacao-conexa/techspec.md
**Ambiente:** http://localhost:5001/api/v1
**Banco:** PostgreSQL — db.tasso.dev.br:5432/mcad (schema: cadastro)
**Auth:** Keycloak JWT — analista.teste (analista-cadastro)

---

## Resultado Geral

```
TASKS TOTAL: 5
PASS:        5
FAIL:        0
BLOCKED:     0
```

**Status: 5/5 PASS**

---

## Resumo por Task

| Task | User Story | Tipo | Cenários | Status |
|------|-----------|------|----------|--------|
| qa_task_01_composicao-participantes | HU-01: Composição de participantes | API + DB | 10/10 | PASS |
| qa_task_02_calculo-automatico | HU-02: Cálculo automático de percentuais | API + DB | 7/7 | PASS |
| qa_task_03_ajuste-manual | HU-03: Ajuste manual de percentual | API | 5/5 | PASS |
| qa_task_04_recalculo-composicao | HU-04: Recálculo ao alterar composição | API | 3/3 | PASS |
| qa_task_05_depuracao-liberado | HU-05: Depuração de fonograma LIBERADO | API + DB | 9/9 | PASS |

**Total de cenários executados: 34/34 PASS**

---

## qa_task_01 — Composição de Participantes: PASS (10/10)

**Fonograma de teste criado:** `ff6075db-450e-4054-9832-0f7d21f42ae7` (ISRC: BRQA02600001)

| Cenário | Expectativa | Resultado |
|---------|-------------|-----------|
| POST INTERPRETE → 201, percentual null | HTTP 201 + percentual=null | PASS |
| POST mesmo titular + categoria diferente (RF-02) → 201 | HTTP 201 + editavel=false para músico | PASS |
| POST mesmo titular + mesma categoria (RF-03) → 409 | HTTP 409 "já está vinculado" | PASS |
| POST PRODUTOR_FONOGRAFICO → 201 | HTTP 201 + percentual=null | PASS |
| GET todos percentuais null, somaCalculada=false | all null, somaCalculada=false | PASS |
| DELETE → 200 com lista atualizada | HTTP 200, lista com 2 itens | PASS |
| DB: 2 rows em participacoes_conexas | INTERPRETE + PRODUTOR, Percentual NULL | PASS |
| DB: PercentuaisDesatualizados=false | false | PASS |

---

## qa_task_02 — Cálculo Automático de Percentuais: PASS (7/7)

**Fonogramas criados:** QA-F01 a QA-F06

| Cenário | Expectativa | Resultado |
|---------|-------------|-----------|
| 1 INT + 1 PROD + 1 MUS → 43.7/41.7/14.6 | somaPercentual=100 | PASS |
| DB: Percentual 4 casas decimais, PercentuaisDesatualizados=false | 43.7000, 41.7000, 14.6000 | PASS |
| 1 INT + 1 PROD sem músico → 50/50 | INT=50, PROD=50 | PASS |
| 2 INT + 1 PROD + 2 MUS (dueto) → split correto | cada INT=21.85, PROD=41.7, cada MUS=7.3 | PASS |
| 1 INT + 1 PROD + 3 MUS → RN-12 arredondamento | MUS1=4.8668, MUS2=4.8666, MUS3=4.8666 | PASS |
| Calcular sem PRODUTOR → 422 | "deve ter ao menos 1 Produtor Fonográfico" | PASS |
| Calcular sem INTÉRPRETE → 422 | "deve ter ao menos 1 Intérprete" | PASS |

---

## qa_task_03 — Ajuste Manual de Percentuais: PASS (5/5)

**Fonograma de teste:** QA-F03 `fd9a8166-6fe8-4c12-a676-7cef6266dcde` (2 INT + 1 PROD + 2 MUS)

| Cenário | Expectativa | Resultado |
|---------|-------------|-----------|
| PUT INTERPRETE percentual=30.0000 → 200 | HTTP 200 + percentual=30.0000 | PASS |
| PUT INTERPRETE 2 percentual=13.7000 → 200 | HTTP 200 + percentual=13.7000 | PASS |
| PUT PRODUTOR percentual=41.7000 → 200 | HTTP 200 + percentual=41.7000 | PASS |
| PUT MUSICO percentual=10.0000 → 422 | "Músico Executante não pode ser editado" | PASS |
| GET: editavel=false para músicos, true para INT/PROD | flags corretas | PASS |

---

## qa_task_04 — Recálculo ao Alterar Composição: PASS (3/3)

**Fonograma de teste:** QA-F03 (com ajustes manuais da task_03)

| Cenário | Expectativa | Resultado |
|---------|-------------|-----------|
| POST add participant → percentuaisDesatualizados=true | true imediatamente após adição | PASS |
| POST calcular → recalcula, ajustes manuais descartados | distribuição igualitária (14.5668/14.5666/14.5666) | PASS |
| DELETE participant → percentuaisDesatualizados=true | true imediatamente após remoção | PASS |

---

## qa_task_05 — Depuração de Fonograma LIBERADO: PASS (9/9)

**Fonogramas:**
- Original (LIBERADO → DEPURADO): `876a6275-52cb-42d6-96dc-2e8ccca0b2bb`
- Novo (PENDENTE_VALIDACAO): `28a70324-3899-4fa7-ac4a-f8a19216bdb3`

| Cenário | Expectativa | Resultado |
|---------|-------------|-----------|
| POST participacoes LIBERADO → 409 DEPURACAO_NECESSARIA | HTTP 409 + code=DEPURACAO_NECESSARIA | PASS |
| PUT participacoes LIBERADO → 409 DEPURACAO_NECESSARIA | HTTP 409 + mensagem contextual | PASS |
| DELETE participacoes LIBERADO → 409 DEPURACAO_NECESSARIA | HTTP 409 + mensagem contextual | PASS |
| POST calcular LIBERADO → 409 DEPURACAO_NECESSARIA | HTTP 409 + mensagem contextual | PASS |
| POST depurar → 201 | fonogramaDepurado=DEPURADO, novoFonograma=PENDENTE_VALIDACAO | PASS |
| Novo fonograma inicia sem participações | participacoes=[] | PASS |
| POST participacoes DEPURADO → 422 | "Fonogramas depurados não podem ser alterados" | PASS |
| DB: original=DEPURADO com ref ao novo | FonogramaDepuradoParaId correto | PASS |

---

## Regras de Negócio Validadas

| Regra | Descrição | Testada | Resultado |
|-------|-----------|---------|-----------|
| RF-01 | Adicionar participante sem percentual | Sim | PASS |
| RF-02 | Mesmo titular pode ter categorias diferentes | Sim | PASS |
| RF-03 | Mesmo titular + mesma categoria → 409 | Sim | PASS |
| RF-05 | Músico automaticamente adicionado como não editável | Sim (via editavel=false) | PASS |
| RF-06 | POST /calcular distribui por categoria | Sim | PASS |
| RN-12 | Truncamento 4 casas decimais + remainder ao primeiro | Sim (3 músicos) | PASS |
| RF-09 | percentuaisDesatualizados=true após add/remove | Sim | PASS |
| RF-10 | Recálculo descarta ajustes manuais | Sim | PASS |
| RF-11 | Mínimo 1 INT + 1 PROD para calcular | Sim | PASS |
| RF-12 | LIBERADO bloqueia add/edit/delete/calcular com 409 | Sim | PASS |
| RF-14 | POST /depurar → original DEPURADO + novo PENDENTE_VALIDACAO | Sim | PASS |
| RF-15 | DEPURADO é read-only (422) | Sim | PASS |

---

## Observações e Anomalias

### Serialização de percentuais na API
A API serializa percentuais sem zeros à direita desnecessários (ex: `43.7` em vez de `43.7000`), enquanto o banco armazena com 4 casas decimais conforme RN-12. Funcionalmente correto — não há perda de precisão.

### Status de fonogramas novos
Fonogramas recém-criados recebem status `PENDENTE_VALIDACAO` (não `PENDENTE`). Todos os cenários de composição, cálculo e edição funcionaram neste status.

### Endpoint POST /depurar requer body
O endpoint `POST /fonogramas/{id}/depurar` exige body com `{isrc, paisOrigem, dataGravacao, dataLancamento}`. O contrato de F06 não documenta isso explicitamente (a feature reutiliza o endpoint de F05). Tentativa inicial sem body retornou HTTP 500 com mensagem "Required parameter 'DepurarFonogramaRequest request' was not provided from body." Após fornecer o body correto, o endpoint funcionou como esperado (201).

### Novo fonograma após depuração sem participações copiadas
O novo fonograma criado pela depuração não herda as participações do original. Começa com `participacoes: []`. O analista deve inserir as participações manualmente. Comportamento considerado correto dado que o propósito da depuração é permitir correções no fonograma.

---

## Dados de Teste Criados

| Fonograma | ISRC | Status Final | Propósito |
|-----------|------|-------------|-----------|
| ff6075db | BRQA02600001 | PENDENTE_VALIDACAO | task_01, task_02 (C1) |
| 9621d31f | BRQA02600002 | PENDENTE_VALIDACAO | task_02 (C2: sem músico) |
| fd9a8166 | BRQA02600003 | PENDENTE_VALIDACAO | task_02 (C3), task_03, task_04 |
| b55d0509 | BRQA02600004 | PENDENTE_VALIDACAO | task_02 (C4: rounding) |
| 8acc36df | BRQA02600005 | PENDENTE_VALIDACAO | task_02 (C5a: só INT) |
| 0b449bad | BRQA02600006 | PENDENTE_VALIDACAO | task_02 (C5b: só PROD) |
| 876a6275 | BRQA02600007 | DEPURADO | task_05 (original) |
| 28a70324 | BRQA02600008 | PENDENTE_VALIDACAO | task_05 (novo após depuração) |

---

## Arquivos de Evidência

```
qa-evidence/
├── qa_session.json
├── qa_report_consolidated.md         (este arquivo)
├── qa_report_consolidated.pdf
├── qa_task_01_composicao-participantes/
│   └── qa_report_task_01.md
├── qa_task_02_calculo-automatico/
│   └── qa_report_task_02.md
├── qa_task_03_ajuste-manual/
│   └── qa_report_task_03.md
├── qa_task_04_recalculo-composicao/
│   └── qa_report_task_04.md
└── qa_task_05_depuracao-liberado/
    └── qa_report_task_05.md
```
