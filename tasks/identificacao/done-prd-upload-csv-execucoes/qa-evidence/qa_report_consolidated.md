# Relatório Consolidado QA — F03: Upload de Execuções via CSV

**PRD:** `tasks/identificacao/done-prd-upload-csv-execucoes/prd.md`  
**Última atualização:** 2026-06-22 (final — todos os bugs corrigidos)  
**Ambiente:** `https://mcad.tasso.dev.br` / `https://mcad-identificacao.tasso.dev.br/api/v1`  
**Analista:** `analista_identificacao@mcad.dev`

---

## Sumário Executivo

| Métrica | Valor |
|---------|-------|
| Tasks executadas | 6 |
| Tasks PASS | 6 |
| Tasks FAIL | 0 |
| Tasks BLOCKED | 0 |
| Bugs encontrados | 4 |
| Bugs corrigidos | 4 |
| Bugs abertos | 0 |

**Conclusão:** Todos os bugs (B01–B04) foram corrigidos e verificados. 6/6 tasks QA passam integralmente. RF-09 fechado após correção do B04. Suite completa de testes: 243/243 passando.

---

## Resultado por Task

| Task | RFs | Status | Observações |
|------|-----|--------|-------------|
| `qa_task_01_auth_e_captacao` | — | **PASS** | Auth OK, botão visível, POST /uploads 202 |
| `qa_task_02_upload_csv_valido` | RF-01, RF-02, RF-07 | **PASS** | Upload OK, processamento OK, listagem corrigida (B01 ✅) |
| `qa_task_03_validacao_erros_csv` | RF-03, RF-08 | **PASS** | 3/3 erros detectados, relatório de erros corrigido (B02 ✅) |
| `qa_task_04_agrupamento_duplicatas` | RF-04, RF-05 | **PASS** | Agrupamento qtd=3 OK, duplicata horário divergente OK |
| `qa_task_05_identificacao_automatica` | RF-06 | **PASS** | ISWC → IDENTIFICADA OK, ISRC → PENDENTE corrigido (B03 ✅) |
| `qa_task_06_campos_condicionais_rubrica` | RF-09 | **PASS** | Rádio OK, Cinema com/sem tipo_utilizacao OK (B04 ✅) |

---

## Bugs — Status Final

| Bug | Descrição | Ciclo | Commit | Status |
|-----|-----------|-------|--------|--------|
| B01 | Listagem de uploads retorna vazia | 2º | `ed7fa22` | ✅ Corrigido |
| B02 | Relatório de erros retorna 400 | 2º | `ed7fa22` | ✅ Corrigido |
| B03 | ISRC desconhecido → erro em vez de PENDENTE | 2º | `ed7fa22` | ✅ Corrigido |
| B04 | Cinema (exigeClassificacao) não rejeita CSV sem `tipo_utilizacao` | 3º | `1c1dbc6` | ✅ Corrigido |

---

## Detalhes — Correções Verificadas

### B01 — Listagem de uploads ✅
```
GET /captacoes/{id}/uploads
→ 200 com {"data":[...8 uploads...],"pagination":{"total":8}}
```

### B02 — Relatório de erros ✅
```
GET /captacoes/{id}/uploads/{uploadId}/erros
→ 200 com {"data":[
  {"linha":2,"coluna":"isrc/iswc","mensagem":"Ao menos um identificador..."},
  {"linha":3,"coluna":"inicio","mensagem":"Formato de hora inválido..."},
  {"linha":4,"coluna":"fim","mensagem":"Horário de fim deve ser posterior..."}
]}
```

### B03 — ISRC → PENDENTE ✅
```
Upload ISRC BRXX99999999:
→ {"status":"Concluido","execucoesCriadas":1,"totalErros":0}
→ Execução: status=Pendente, isrc=BRXX99999999
```

### B04 — Cinema sem tipo_utilizacao ✅

**Causa:** `CsvProcessorWorker.cs:74` usava `captacao.Rubrica?.Nome?.Contains("TV Aberta")` para decidir se exigia classificação. Como só o nome "TV Aberta" casava, Cinema, TV Fechada e VOD (que também têm `ExigeClassificacao=true` no seed) escapavam da validação — RN-12 quebrada.

**Correção (commit `1c1dbc6`):** passou a usar a propriedade de domínio `captacao.Rubrica?.ExigeClassificacao ?? false`, que cobre todas as rubricas audiovisuais (TV Aberta, TV Fechada, Cinema, VOD).

| Arquivo | Mudança |
|---------|---------|
| `CsvProcessorWorker.cs:74` | `Rubrica.Nome.Contains("TV Aberta")` → `Rubrica.ExigeClassificacao` |
| `CsvParser.cs:95,100` | Mensagens de erro generalizadas para "rubricas audiovisuais" |
| `CsvParserTests.cs:93-106` | Teste `Parse_NaoAudiovisualSemTipoUtilizacao_AceitaLinha` (RF-09 #2) |

```
Upload Cinema sem tipo_utilizacao:
→ {"status":"ConcluidoComErros","execucoesCriadas":0,"totalErros":1}
→ Erro: linha=2, coluna="tipo_utilizacao", "Obrigatório para rubricas audiovisuais (TA, TE, PE, BK)"
```

---

## Correção Adicional — Integration Tests (2026-06-22)

3 testes de integração em `UsuarioMusicaEndpointsIntegrationTests` falhavam por contaminação de dados:

| Teste | Erro | Causa |
|-------|------|-------|
| `Get_BuscaPorTermo_RetornaApenasAtivos` | Expected 2, found 4 | Duplicatas de snapshots |
| `Get_Paginacao_RespeitaTamanho` | Expected TotalPages=2, found 6 | Snapshots acumulados |
| `Get_BuscaPorCnpj_FiltraCorretamente` | Expected 1, found 4 | Snapshots acumulados |

**Causa:** `InitializeAsync` semeava 3 snapshots sem limpar registros prévios. Como `IdentificacaoApiFactory` compartilha o container PostgreSQL entre todas as classes de teste, snapshots de execuções anteriores acumulavam.

**Correção:** adicionada limpeza `db.UsuariosMusicaSnapshot.RemoveRange(...)` antes do seed.

---

## Cobertura de Requisitos — Final

| RF | Descrição | Status |
|----|-----------|--------|
| RF-01 | Upload CSV para storage | ✅ PASS |
| RF-02 | Processamento assíncrono | ✅ PASS |
| RF-03 | Validação linha a linha | ✅ PASS |
| RF-04 | Agrupamento de linhas | ✅ PASS |
| RF-05 | Detecção ISRC duplicado | ✅ PASS |
| RF-06 | Identificação via Cadastro | ✅ PASS |
| RF-07 | Tela de Uploads com status | ✅ PASS |
| RF-08 | Relatório de erros | ✅ PASS |
| RF-09 | Campos condicionais por rubrica | ✅ PASS |

**Resumo RFs:** 9/9 PASS

---

## Comparativo: Antes vs Depois das Correções

| | 1º ciclo (06-16) | 2º ciclo (06-20) | 3º ciclo (retest) | 4º ciclo (06-22 final) |
|---|---|---|---|---|
| POST /uploads | 500 | 202 | 202 | 202 |
| B01 — listagem | — | ❌ vazia | ✅ corrigido | ✅ |
| B02 — /erros | — | ❌ 400 | ✅ corrigido | ✅ |
| B03 — ISRC→PENDENTE | — | ❌ erro | ✅ corrigido | ✅ |
| B04 — Cinema sem tipo | — | — | ❌ novo | ✅ corrigido |
| Tasks PASS | 1 | 1 | 5 | **6** |
| Tasks FAIL | 0 | 3 | 0 | **0** |
| Tasks BLOCKED | 5 | 2 | 0 | **0** |

---

## Resultado Final — Suite de Testes

| Camada | Total | Passed | Failed |
|--------|-------|--------|--------|
| Unit tests (Identificacao.Tests) | 176 | 176 | 0 |
| Integration tests (Identificacao.IntegrationTests) | 67 | 67 | 0 |
| **Total** | **243** | **243** | **0** |

---

## Excluído do Escopo (conforme acordado)

- Perfil consultor-identificacao
- Validação de banco de dados
- Formatos não-CSV
- Cancelamento de processamento

---

*Relatório consolidado final — 2026-06-22*
