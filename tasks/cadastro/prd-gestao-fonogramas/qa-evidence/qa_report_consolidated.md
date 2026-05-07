# Relatório QA Consolidado — F05: Gestão de Fonogramas

**Projeto:** mcad (mini-ECAD)
**Feature:** F05 — Gestão de Fonogramas
**Domínio:** Cadastro (D01)
**Serviço:** cadastro-api (.NET 8 Minimal API — http://localhost:5001)
**Executado em:** 2026-04-10
**Executado por:** QA Orchestrator (Claude)

---

## Resumo Executivo

| Métrica | Valor |
|---------|-------|
| Total de tasks | 5 |
| Tasks PASS | 4 |
| Tasks FAIL | 1 |
| Tasks BLOCKED | 0 |
| Total de casos de teste | 55 |
| Casos PASS | 51 |
| Casos FAIL | 4 |
| Taxa de sucesso | 92,7% |

**Veredicto geral:** FAIL — A feature está majoritariamente funcional, porém apresenta 3 bugs na listagem de fonogramas (HU-02) que impedem filtros e ordenação de funcionarem corretamente.

---

## Resultado por Task

| Task | User Story | Tipo | Status | PASS | FAIL |
|------|-----------|------|--------|------|------|
| qa_task_01_criar-fonograma | HU-01 — Criar fonograma | API + DB | **PASS** | 12 | 0 |
| qa_task_02_listar-fonogramas | HU-02 — Listar fonogramas | API | **FAIL** | 6 | 4 |
| qa_task_03_fonogramas-na-obra | HU-03 — Fonogramas da obra | API | **PASS** | 6 | 0 |
| qa_task_04_editar-fonograma | HU-04 — Editar e excluir | API + DB | **PASS** | 15 | 0 |
| qa_task_05_depuracao-isrc | HU-05 — Depuração por ISRC | API + DB | **PASS** | 12 | 0 |

---

## Detalhamento por Task

### qa_task_01 — Criar Fonograma (HU-01): PASS

**12/12 casos passaram.**

Comportamentos validados:
- Criação com campos obrigatórios e opcionais retorna 201 com status PENDENTE_VALIDACAO
- ISRC recebido sem hífens, exibido formatado como CC-XXX-YY-NNNNN
- ISRC duplicado retorna 409 com mensagem descritiva
- ISRC com formato inválido retorna 400 com validação detalhada
- Obra obrigatória: UUID inválido retorna 400; UUID válido inexistente retorna 404
- Datas são opcionais: fonograma criado sem datas retorna dataGravacao/dataLancamento=null
- GET por ID retorna dados completos incluindo obra aninhada e fonogramaDepuradoParaId=null
- Consultor tem acesso de leitura; POST retorna 403 para Consultor; sem token retorna 401
- DB confirmado: ISRC armazenado sem hífens, Status=PENDENTE_VALIDACAO, FK obra correta

**Requisitos RF-01, RF-02, RF-03, RF-04, RF-05, RF-26, RF-27: PASS**

---

### qa_task_02 — Listar Fonogramas (HU-02): FAIL

**6/10 casos passaram. 4 FAIL.**

Comportamentos corretos:
- Paginação server-side funciona (page/size, total, totalPages) — RF-06 PASS
- Filtro por obraId funciona corretamente — RF-08 parcial PASS
- Filtro por obraTitulo (parcial) funciona corretamente — RF-08 parcial PASS
- Filtro por país (parcial) funciona corretamente — RF-08 parcial PASS
- Listagem exibe campos esperados com isrcFormatado, obra aninhada, status, dataLancamento — RF-09 PASS
- Consultor pode listar — controle de acesso PASS

**BUGS encontrados:**

**BUG-02-01 — Severidade Alta:** Filtro `?isrc=` completamente ignorado
- Qualquer valor no parâmetro `isrc` retorna todos os registros
- Confirmado com valor impossível `isrc=ZZZZZ` que retorna todos os 3 fonogramas
- Requisito RF-08 ("filtros: ISRC parcial") não atendido
- Impacto: usuários não conseguem filtrar por ISRC

**BUG-02-02 — Severidade Crítica:** Filtro `?status=` causa erro 500
- Parâmetro `status=PENDENTE_VALIDACAO` retorna: "Failed to bind parameter 'Nullable<StatusFonograma> Status' from 'PENDENTE_VALIDACAO'"
- O enum StatusFonograma não está sendo desserializado corretamente do query string
- Requisito RF-08 ("filtros: status (exato)") não atendido
- Impacto: toda tentativa de filtro por status causa erro 500 no servidor

**BUG-02-03 — Severidade Média:** Ordenação DESC ignorada
- `sort=isrc,desc` e `sort=isrc,asc` retornam a mesma sequência ascendente
- Parâmetro de direção de ordenação não tem efeito
- Requisito RF-07 ("ordenação server-side por ISRC") parcialmente atendido (ASC funciona, DESC não)
- Impacto: usuários não conseguem ordenar em sentido decrescente

**BUG-02-04 (complementar ao BUG-02-01):** Confirmação de filtro ISRC ignorado com valor impossível ZZZZZ.

---

### qa_task_03 — Fonogramas na Obra (HU-03): PASS

**6/6 casos passaram.**

Comportamentos validados:
- GET /api/v1/obras/{obraId}/fonogramas retorna array sem paginação
- Obra com fonogramas retorna array com itens completos (id, isrcFormatado, status, paisOrigem, dataLancamento)
- Obra sem fonogramas retorna array vazio (não retorna 404)
- Obra inexistente retorna 404
- Resposta é array puro (sem wrapper de paginação) — RF-10 PASS
- Consultor pode acessar o endpoint — PASS
- Obra DEPURADA retorna fonogramas normalmente (leitura não bloqueada) — RF-13 PASS

**Requisitos RF-10, RF-13: PASS**

---

### qa_task_04 — Editar Fonograma (HU-04): PASS

**15/15 casos passaram.**

Comportamentos validados:
- PUT PENDENTE: edição livre de ISRC, país e datas retorna 200
- PUT PENDENTE com ISRC duplicado: 409 com mensagem
- PUT PENDENTE com ISRC inválido: 400 com validação
- PUT fonograma inexistente: 404
- DELETE PENDENTE_VALIDACAO: 204; GET confirmado com 404 (remoção física)
- PUT LIBERADO + país/datas (mesmo ISRC): 200 — edição sem depuração para campos não-ISRC
- PUT LIBERADO + ISRC diferente: 409 com code=DEPURACAO_NECESSARIA — RF-16 PASS
- DELETE LIBERADO: 409 "Fonogramas liberados ou depurados não podem ser excluídos"
- PUT DEPURADO: 422 "Fonogramas depurados não podem ser editados" — imutabilidade PASS
- DELETE DEPURADO: 409 (mesmo comportamento do LIBERADO)
- Consultor: PUT retorna 403; DELETE retorna 403
- DB confirmado: edição de país/datas em LIBERADO persiste corretamente sem alterar status

**Requisitos RF-14, RF-15, RF-16, RF-17, RF-28, RF-29: PASS**

---

### qa_task_05 — Depuração por ISRC (HU-05): PASS

**12/12 casos passaram.**

Comportamentos validados:
- POST /depurar em PENDENTE retorna 409 "Apenas fonogramas LIBERADOS podem ser depurados"
- POST /depurar em LIBERADO retorna 201 com dois objetos: fonogramaDepurado e novoFonograma
- Original: Status=DEPURADO, ISRC original preservado, FonogramaDepuradoParaId=ID do novo, ObraId inalterado
- Novo: Status=PENDENTE_VALIDACAO, novo ISRC, mesma ObraId, FonogramaDepuradoParaId=null
- POST /depurar em já DEPURADO retorna 409 (imutabilidade total)
- PUT em DEPURADO retorna 422 (imutabilidade total)
- POST /depurar com novo ISRC já existente retorna 409 (unicidade verificada)
- POST /depurar em inexistente retorna 404
- Consultor não pode depurar (403)
- DB: self-ref FK FonogramaDepuradoParaId corretamente populada
- DB: mesma obra confirmada em original e novo fonograma

**Requisitos RF-18, RF-19, RF-20, RF-22: PASS**

---

## Bugs Registrados

| ID | Task | Severidade | Endpoint | Descrição | Requisito |
|----|------|-----------|----------|-----------|-----------|
| BUG-02-01 | qa_task_02 | Alta | GET /fonogramas?isrc= | Filtro ISRC completamente ignorado — qualquer valor retorna todos os registros | RF-08 |
| BUG-02-02 | qa_task_02 | Crítica | GET /fonogramas?status= | 500 Internal Server Error — "Failed to bind parameter Nullable<StatusFonograma>" | RF-08 |
| BUG-02-03 | qa_task_02 | Média | GET /fonogramas?sort=isrc,desc | Ordenação DESC ignorada — idêntica ao ASC | RF-07 |

---

## Cobertura de Requisitos

| Requisito | Descrição Resumida | Task | Status |
|-----------|-------------------|------|--------|
| RF-01 | Criar fonograma com campos obrigatórios e opcionais | task_01 | PASS |
| RF-02 | Validação formato ISRC CC-XXX-YY-NNNNN | task_01 | PASS |
| RF-03 | ISRC único → 409 em duplicata | task_01 | PASS |
| RF-04 | Obra obrigatória e validada | task_01 | PASS |
| RF-05 | Status inicial PENDENTE_VALIDACAO | task_01 | PASS |
| RF-06 | Paginação server-side | task_02 | PASS |
| RF-07 | Ordenação server-side (ASC ok, DESC quebrado) | task_02 | FAIL |
| RF-08 | Filtros (obraId: ok; obraTitulo: ok; pais: ok; ISRC: falha; status: 500) | task_02 | FAIL |
| RF-09 | Campos exibidos na listagem | task_02 | PASS |
| RF-10 | Seção fonogramas na obra | task_03 | PASS |
| RF-13 | Obra DEPURADA: seção read-only (API não bloqueia leitura) | task_03 | PASS |
| RF-14 | PENDENTE: edição livre de ISRC/país/datas | task_04 | PASS |
| RF-15 | Validar formato e unicidade ao alterar ISRC | task_04 | PASS |
| RF-16 | LIBERADO + ISRC diferente → 409 DEPURACAO_NECESSARIA | task_04 | PASS |
| RF-17 | LIBERADO + país/datas → 200 sem depuração | task_04 | PASS |
| RF-18 | Depuração: original DEPURADO + novo PENDENTE_VALIDACAO, mesma obra | task_05 | PASS |
| RF-19 | ISRC original preservado, FK FonogramaDepuradoParaId populada | task_05 | PASS |
| RF-20 | Novo fonograma sem conexos | task_05 | PASS |
| RF-22 | Endpoint POST /depurar reutilizável | task_05 | PASS |
| RF-26 | GET por ID com dados completos incluindo obra aninhada | task_01 | PASS |
| RF-27 | 404 para fonograma inexistente | task_01 | PASS |
| RF-28 | DELETE apenas em PENDENTE → 204 | task_04 | PASS |
| RF-29 | DELETE LIBERADO/DEPURADO → 409 | task_04 | PASS |

**Requisitos cobertos e passando:** 20/23
**Requisitos com falha:** 2/23 (RF-07, RF-08)
**Requisitos não testados:** 1/23 (RF-23: interdependência status obra — fora de escopo acordado)

---

## Ambiente e Configuração

| Item | Valor |
|------|-------|
| Base URL | http://localhost:5001/api/v1 |
| Autenticação | Keycloak JWT (https://keycloak.tasso.dev.br) |
| Banco | PostgreSQL 16 @ db.tasso.dev.br:5432 (schema cadastro) |
| Perfis testados | analista.teste (Analista), consultor.teste (Consultor) |
| Setup DB | Status LIBERADO/DEPURADO injetados via UPDATE direto (F07 fora de escopo) |

---

## Evidências

| Task | Relatório Individual |
|------|---------------------|
| qa_task_01_criar-fonograma | qa-evidence/qa_task_01_criar-fonograma/qa_report_task_01.md |
| qa_task_02_listar-fonogramas | qa-evidence/qa_task_02_listar-fonogramas/qa_report_task_02.md |
| qa_task_03_fonogramas-na-obra | qa-evidence/qa_task_03_fonogramas-na-obra/qa_report_task_03.md |
| qa_task_04_editar-fonograma | qa-evidence/qa_task_04_editar-fonograma/qa_report_task_04.md |
| qa_task_05_depuracao-isrc | qa-evidence/qa_task_05_depuracao-isrc/qa_report_task_05.md |

---

*Relatório gerado pelo QA Orchestrator em 2026-04-10.*
*Ferramentas utilizadas: curl, jq, psql (PostgreSQL client).*
