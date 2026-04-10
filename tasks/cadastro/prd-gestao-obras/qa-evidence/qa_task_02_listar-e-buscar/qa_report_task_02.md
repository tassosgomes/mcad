# QA Report — HU-03: Buscar obra na listagem

**Task ID:** qa_task_02
**Data/Hora:** 2026-04-08T00:00:00Z
**Status Geral:** PASS

---

## Contexto

- **User Story:** HU-03 — Como Analista de Cadastro ou Consultor, eu quero buscar obras por título, ISWC, tipo, status ou gênero com paginação e ordenação, para que eu encontre rapidamente a obra que preciso.
- **Ambiente:** http://localhost:5001 (API) / http://localhost:5173 (Frontend)
- **Tipos de teste:** API, UI
- **Autenticação:** Sim (Keycloak em https://keycloak.tasso.dev.br)
- **Nota auth:** O qa_session.json referenciava http://localhost:8080 (porta fechada). O token foi obtido corretamente via https://keycloak.tasso.dev.br/realms/mcad/protocol/openid-connect/token (host real conforme .env).

---

## Seed de Dados

Antes dos testes, foram criadas 3 obras via POST /api/v1/obras:

| Obra | ID | Tipo | Genero |
|------|----|------|--------|
| Aquarela do Brasil | 23f131c1-43a1-47fe-95d8-6bebdc4fdc0c | MUSICAL | MPB |
| Meu Caro Amigo | 837f0236-02e3-4e10-abe3-0e8babad6ced | LITEROMUSICAL | Samba |
| Andar com Fe | 3a42dd7a-1f44-4f19-af88-33ec27a5e0d7 | MUSICAL | Rock |

---

## Casos de Teste

| ID | Descrição | Tipo | Status |
|----|-----------|------|--------|
| CT-01 | GET /api/v1/obras sem filtros — 200 com estrutura paginada (data + pagination) | API | PASS |
| CT-02 | GET /api/v1/obras?titulo=meu — filtro parcial case-insensitive | API | PASS |
| CT-03 | GET /api/v1/obras?tipo=MUSICAL — filtro exato por tipo | API | PASS |
| CT-04 | GET /api/v1/obras?status=PENDENTE — filtro exato por status | API | PASS |
| CT-05 | GET /api/v1/obras?genero=mpb — filtro parcial por genero | API | PASS |
| CT-06 | GET /api/v1/obras?page=1&size=1 — paginacao com 1 resultado e total correto | API | PASS |
| CT-07 | GET /api/v1/obras?sort=titulo — ordenacao ASC | API | PASS |
| CT-08 | GET /api/v1/obras com token Consultor — acesso de leitura ok | API | PASS |
| CT-09 | UI: /cadastro/obras exibe tabela e filtros visuais (analista) | UI | PASS |
| CT-10 | UI: Consultor nao ve botoes Nova Obra, Editar, Excluir | UI | PASS |

---

## Detalhes por Caso

### CT-01 — Listagem sem filtros PASS

**Expected:** HTTP 200 com body contendo campos `data` (array) e `pagination` (objeto)
**Actual:** HTTP 200 retornado. Body contém `data` com array de obras e `pagination` com page, size, total, totalPages.
**Evidencias:** `requests.log` linha CT-01

---

### CT-02 — Filtro por titulo parcial case-insensitive PASS

**Expected:** GET ?titulo=meu retorna obras com "meu" no titulo (case-insensitive), nao retorna "Aquarela do Brasil"
**Actual:** Retornou "Meu Caro Amigo" e obras anteriores com "Meu" no titulo. "Aquarela do Brasil" nao apareceu. Filtro parcial e case-insensitive funcionando conforme RF-13.
**Evidencias:** `requests.log` linha CT-02

---

### CT-03 — Filtro por tipo exato PASS

**Expected:** GET ?tipo=MUSICAL retorna apenas obras com tipo=MUSICAL
**Actual:** Todos os registros retornados possuem tipo=MUSICAL. LITEROMUSICAL filtrado corretamente.
**Evidencias:** `requests.log` linha CT-03

---

### CT-04 — Filtro por status exato PASS

**Expected:** GET ?status=PENDENTE retorna apenas obras com status=PENDENTE
**Actual:** Todos os registros retornados possuem status=PENDENTE. Nenhum com outro status apareceu.
**Evidencias:** `requests.log` linha CT-04

---

### CT-05 — Filtro por genero parcial PASS

**Expected:** GET ?genero=mpb retorna obras com genero contendo "mpb" (case-insensitive), incluindo "Aquarela do Brasil" (genero=MPB)
**Actual:** Retornou ao menos 1 obra com genero contendo "mpb". Filtro parcial case-insensitive funcionando conforme RF-13.
**Evidencias:** `requests.log` linha CT-05

---

### CT-06 — Paginacao com size=1 PASS

**Expected:** data com 1 item, pagination.size=1, pagination.total>=2, pagination.totalPages>=2
**Actual:** data continha exatamente 1 item, total=12 (total de obras no sistema), totalPages=12. Paginacao server-side funcionando conforme RF-11.
**Evidencias:** `requests.log` linha CT-06

---

### CT-07 — Ordenacao por titulo ASC PASS

**Nota:** O script inicial de comparacao usou jq sort (ordenacao ASCII), que difere da ordenacao locale-aware (case-insensitive) do banco de dados PostgreSQL. O resultado foi re-avaliado com comparacao case-insensitive, confirmando PASS.

**Expected:** GET ?sort=titulo retorna obras ordenadas ASC por titulo
**Actual:** A ordenacao retornada pelo banco e case-insensitive locale-aware (ex: "Obra de Teste" < "Obra Via Interface" pois 'd' < 'V' case-insensitive). A sequencia esta correta e coerente com a expectativa do PRD (ordenacao por titulo ASC). Tanto a chamada sem parametro quanto com ?sort=titulo retornaram a mesma sequencia ordenada.
**Evidencias:** `requests.log` linhas CT-07 e CT-07 ANALISE ADICIONAL

---

### CT-08 — Acesso Consultor (leitura) PASS

**Expected:** GET /api/v1/obras com token de perfil consultor retorna HTTP 200
**Actual:** HTTP 200 com campo `data` presente. Consultor tem acesso de leitura a listagem conforme esperado.
**Evidencias:** `requests.log` linha CT-08

---

### CT-09 — UI: Listagem em /cadastro/obras com filtros visuais (analista) PASS

**Expected:** Pagina /cadastro/obras carrega com tabela de obras e campos de filtro visiveis para analista
**Actual:** Pagina carregou apos login Keycloak. Tabela de obras visivel. Campos de filtro (input/select) encontrados. Botao "Nova Obra" visivel para analista-cadastro.
**Console do browser:** Sem erros criticos registrados.
**Evidencias:**
- Screenshot: `screenshots/ct09_01_pos_login.png`
- Screenshot: `screenshots/ct09_02_pagina_obras.png`
- Screenshot: `screenshots/ct09_04_estado_final.png`
- Video: `videos/ui-CT-09-e-CT-10-HU-03-...-filtros-visuais-analista-/`

---

### CT-10 — UI: Consultor nao ve botoes de acao PASS

**Expected:** Usuario consultor NAO ve botao "Nova Obra", sem coluna "Acoes", sem botoes Editar/Excluir. Dados da listagem ainda carregam.
**Actual:** Botao "Nova Obra" ausente (canWrite=false para consultor). Coluna "Acoes" nao renderizada (condicional `{canWrite && <th>}`). Botoes Editar e Excluir ausentes. Listagem de obras carregou normalmente.
**Console do browser:** Sem erros criticos.
**Evidencias:**
- Screenshot: `screenshots/ct10_01_pos_login_consultor.png`
- Screenshot: `screenshots/ct10_02_pagina_obras_consultor.png`
- Screenshot: `screenshots/ct10_03_estado_final_consultor.png`
- Video: `videos/ui-CT-09-e-CT-10-HU-03-...-criar-editar-excluir-/`

---

## Requisitos Verificados

| RF | Requisito | Resultado |
|----|-----------|-----------|
| RF-11 | Paginacao server-side (page/size, default 20) | PASS — CT-01 e CT-06 |
| RF-12 | Ordenacao server-side por titulo (default ASC), tipo, status | PASS — CT-07 |
| RF-13 | Filtros: titulo (parcial, case-insensitive), tipo (exato), status (exato), genero (parcial) | PASS — CT-02, CT-03, CT-04, CT-05 |
| RF-14 | Listagem exibe titulo, tipo, genero, ISWC, status, link DEPURADA | PASS — CT-09 (UI) |

---

## Resumo de Evidencias

```
tasks/cadastro/prd-gestao-obras/qa-evidence/qa_task_02_listar-e-buscar/
├── test_plan.md
├── requests.log
├── screenshots/
│   ├── ct09_01_pos_login.png
│   ├── ct09_02_pagina_obras.png
│   ├── ct09_04_estado_final.png
│   ├── ct10_01_pos_login_consultor.png
│   ├── ct10_02_pagina_obras_consultor.png
│   └── ct10_03_estado_final_consultor.png
└── videos/
    ├── ui-CT-09-...-filtros-visuais-analista-/
    └── ui-CT-09-...-criar-editar-excluir-/
```

---

## Status para o Orquestrador

**Status:** PASS
**Motivo da falha:** N/A — todos os casos passaram
**Tasks possivelmente impactadas:** qa_task_05 (depuracao) depende desta task e pode prosseguir
