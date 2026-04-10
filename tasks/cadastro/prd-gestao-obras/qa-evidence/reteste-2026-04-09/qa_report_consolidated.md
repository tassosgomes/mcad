# Relatório QA Consolidado — Reteste F03: Gestão de Obras Musicais
**Sessão:** Reteste 2026-04-10 (baseada em qa_session.json 2026-04-09)
**PRD:** tasks/cadastro/prd-gestao-obras/prd.md
**Tech Spec:** tasks/cadastro/prd-gestao-obras/techspec.md + techspec-frontend.md
**API Contract:** tasks/cadastro/prd-gestao-obras/api-contract.yaml
**Ambiente:** http://localhost:5001 (API) | http://localhost:5173 (Frontend)
**Auth:** Bearer JWT via Keycloak (analista.teste)
**Banco:** PostgreSQL schema=cadastro em db.tasso.dev.br

---

## Resultado Geral

| Status | Tasks |
|--------|-------|
| PASS | 5 (qa_task_01, qa_task_04, qa_task_07, mais parcial de 02/03/05/06) |
| FAIL | 3 (qa_task_02, qa_task_03, qa_task_05, qa_task_06 têm falhas) |
| BLOCKED | 0 |

**Resultado por task:**

| Task | Descrição | CTs Testados | CTs Pass | CTs Fail | Status |
|------|-----------|-------------|---------|---------|--------|
| qa_task_01 | HU-01: Criar obra musical | 9 | 9 | 0 | PASS |
| qa_task_02 | HU-03: Buscar obra na listagem | 10 | 9 | 1 | FAIL |
| qa_task_03 | HU-04: Editar dados da obra | 9 | 8 | 1 | FAIL |
| qa_task_04 | HU-02: Obter ISWC via API externa | 8 | 8 | 0 | PASS |
| qa_task_05 | RF-06 a RF-10: Depuração automática | 9 | 8 | 1 | FAIL |
| qa_task_06 | HU-05: Domínio Público | 6 | 5 | 1 | FAIL |
| qa_task_07 | RF-27 a RF-32: Exclusão de obras | 7 (+1 N/A) | 7 | 0 | PASS |

**Total:** 58 CTs testados | 54 PASS | 4 FAIL | 1 N/A

---

## Falhas Anteriores — Status no Reteste

| ID | Falha Original | Status |
|----|---------------|--------|
| [F1] | POST /obras sem titulo ou tipo inválido retornava HTTP 500 | CORRIGIDO |
| [F2] | PUT /obras/{id} com titulo vazio retornava HTTP 200 | CORRIGIDO |
| [F3] | Mensagem de erro na exclusão de obra com titularidades divergia do PRD | CORRIGIDO |
| [F4] | Item não encontrado na listagem após criação (timing UI) | CORRIGIDO |
| [F5] | CTs 07/08/09 da qa_task_03 não executados | EXECUTADOS (revelaram nova falha) |

**4 de 5 falhas anteriores corrigidas. [F5] executado e revelou nova falha (422 vs 409).**

---

## Falhas Novas Identificadas no Reteste

### FALHA-A: Filtro ISWC parcial não funciona (qa_task_02 CT-06)

**Requisito:** RF-13 — "Filtros: (...) ISWC (parcial)"
**Comportamento esperado:** GET /obras?iswc=T-721 retorna obras com ISWC contendo "T-721"
**Comportamento obtido:** GET /obras?iswc=T-721 retorna 0 resultados; apenas filtro exato funciona
**Impacto:** Médio — usuário precisa digitar o ISWC completo para filtrar
**Evidência:** Obra "Garota de Ipanema" tem ISWC T-721428352-3, mas iswc=T-721 retorna 0 resultados

---

### FALHA-B: HTTP 422 vs 409 para operações em obra DEPURADA (qa_task_03 CT-07, qa_task_05 CT-05, qa_task_06 CT-05)

**Requisito:** API Contract — resposta 409 para operações bloqueadas por status da obra
**Comportamento esperado:** PUT em obra DEPURADA → HTTP 409 (Conflict)
**Comportamento obtido:** PUT em obra DEPURADA → HTTP 422 (Unprocessable Entity)
**Impacto:** Baixo/Médio — semântica incorreta; mensagem está correta; pode afetar tratamento no frontend
**Afeta:** PUT /obras/{id}, PUT /obras/{id}/dominio-publico, quando obra está DEPURADA
**Não afeta:** DELETE /obras/{id} DEPURADA → retorna 409 corretamente
**Evidência:**
```json
HTTP 422:
{"title":"Unprocessable Entity","status":422,"detail":"Obras depuradas não podem ser editadas"}
HTTP 409 esperado:
{"title":"Conflict","status":409,"detail":"Operação não permitida para obras com status DEPURADA","code":"..."}
```

---

## Detalhamento por Task

### qa_task_01 — HU-01: Criar Obra Musical — PASS

Todos os 9 CTs passaram. As falhas [F1] e [F4] foram corrigidas.

- POST com dados válidos → 201 com status PENDENTE e iswc null
- POST sem título/tipo inválido → 400 (corrigido de 500)
- POST com título vazio → 400 (corrigido de 500)
- Persistência no banco confirmada
- Fluxo UI: obra aparece na listagem imediatamente após criação (corrigido timing)

### qa_task_02 — HU-03: Buscar Obra na Listagem — FAIL

9/10 CTs passaram. 1 falha: filtro ISWC parcial não funciona (FALHA-A).

- Paginação server-side correta
- Filtro por título parcial case-insensitive: OK
- Filtro por tipo exato: OK
- Filtro por status exato: OK
- Filtro por gênero parcial: OK
- Ordenação ASC/DESC: OK
- Filtro por ISWC parcial: FALHA

### qa_task_03 — HU-04: Editar Dados da Obra — FAIL

8/9 CTs passaram. 1 falha: HTTP 422 vs 409 para PUT em obra DEPURADA (FALHA-B).
As falhas [F2] e [F5] foram endereçadas:

- PUT obra PENDENTE: edição livre funciona
- PUT com título vazio → 400 (corrigido de 200)
- PUT obra LIBERADA com título diferente → 409 DEPURACAO_NECESSARIA: OK
- PUT obra DEPURADA → 422 (esperado 409)
- PUT obra LIBERADA só tipo/gênero/subtítulo → 200: OK
- Persistência confirmada no banco

### qa_task_04 — HU-02: Obter ISWC via API Externa — PASS

Todos os 8 CTs passaram.

- Integração com https://iswc.tasso.dev.br/ funcionando
- ISWC salvo e status muda para LIBERADO
- Obra sem titulares → 422 com mensagem adequada
- Obra já com ISWC → 422 com mensagem adequada
- Índice único confirmado no banco

### qa_task_05 — RF-06 a RF-10: Depuração Automática — FAIL

8/9 CTs passaram. 1 falha: HTTP 422 vs 409 para PUT em obra DEPURADA (FALHA-B).

- PUT LIBERADA com novo título → 409 DEPURACAO_NECESSARIA: OK
- POST /depurar → 201 com DepuracaoResponse correto: OK
- Obra original: status DEPURADA, ISWC mantido, obraDepuradaParaId correto: OK
- Nova obra: status PENDENTE, iswc null, título novo: OK
- PUT em DEPURADA → 422 (esperado 409)
- Alteração só tipo/gênero sem depuração: OK
- POST /depurar em DEPURADA/PENDENTE → 409: OK
- Persistência no banco confirmada com FK correta

### qa_task_06 — HU-05: Marcar Domínio Público — FAIL

5/6 CTs passaram. 1 falha: HTTP 422 vs 409 para obra DEPURADA (FALHA-B).

- Marcar PENDENTE como DP → 200, status=DOMINIO_PUBLICO: OK
- Desmarcar → volta para PENDENTE: OK
- Marcar LIBERADA → 200: OK
- Desmarcar LIBERADA → volta para LIBERADO (com ISWC): OK
- Marcar DEPURADA → 422 (esperado 409)
- Persistência confirmada no banco

### qa_task_07 — RF-27 a RF-32: Exclusão de Obras — PASS

Todos os 7 CTs testados passaram. [F3] corrigida.

- DELETE sem vínculos → 204: OK
- DELETE inexistente → 404: OK
- DELETE DEPURADA → 409 com mensagem "Obras depuradas não podem ser excluídas.": OK
- DELETE com titularidades → 409 com mensagem específica: OK
- GET após exclusão → 404: OK
- GET /obras/{id} com todos os campos incluindo obraDepuradaParaId: OK

---

## Observações Gerais

1. **Campo extra no response:** Todos os responses incluem campos `codigo` (int sequencial) e `bloqueioJustificativa` não documentados no API Contract. Funcionam corretamente mas divergem da spec.

2. **Mensagem de detalhe 404:** A mensagem "Obra não encontrada. com ID '...' não foi encontrado" tem um ponto e uma preposição redundante ("com ID...") que poderia ser melhorada. Não é uma falha funcional.

3. **Padrão HTTP 422 vs 409:** As três tarefas (03, 05, 06) apresentam a mesma divergência para operações em obra DEPURADA via PUT. O endpoint DELETE retorna 409 corretamente. Isso sugere uma inconsistência na implementação do GlobalExceptionHandler entre diferentes tipos de operação.

4. **API externa ISWC:** Disponível e respondendo corretamente durante toda a sessão de testes.

5. **Frontend:** Testado na qa_task_01 com Playwright — login Keycloak, criação de obra e verificação na listagem. Demais funcionalidades UI não foram testadas exaustivamente nesta sessão (foco em API).

---

## Recomendações

1. **Prioridade ALTA:** Corrigir HTTP 422 → 409 no GlobalExceptionHandler para `DomainException` em operações de PUT com obra DEPURADA (FALHA-B afeta tasks 03, 05 e 06).

2. **Prioridade MÉDIA:** Implementar filtro ISWC como busca parcial (ILIKE '%valor%') em vez de exata (FALHA-A).

3. **Prioridade BAIXA:** Documentar/remover campos `codigo` e `bloqueioJustificativa` do API Contract, ou adicioná-los ao contrato.

---

## Evidências

Evidências salvas em:
`tasks/cadastro/prd-gestao-obras/qa-evidence/reteste-2026-04-09/`

| Task | Relatório | Screenshots |
|------|-----------|-------------|
| qa_task_01 | qa_task_01_criar-obra/qa_report_task_01.md | 7 screenshots |
| qa_task_02 | qa_task_02_listar-e-buscar/qa_report_task_02.md | — |
| qa_task_03 | qa_task_03_editar-obra/qa_report_task_03.md | — |
| qa_task_04 | qa_task_04_obter-iswc/qa_report_task_04.md | — |
| qa_task_05 | qa_task_05_depuracao/qa_report_task_05.md | — |
| qa_task_06 | qa_task_06_dominio-publico/qa_report_task_06.md | — |
| qa_task_07 | qa_task_07_exclusao/qa_report_task_07.md | — |
