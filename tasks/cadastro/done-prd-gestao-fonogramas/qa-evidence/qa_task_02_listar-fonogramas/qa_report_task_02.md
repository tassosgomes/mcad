# QA Report — qa_task_02: Listar Fonogramas (HU-02)

**Feature:** F05 — Gestão de Fonogramas
**Task:** qa_task_02_listar-fonogramas
**User Story:** HU-02 — Como Analista ou Consultor, quero buscar fonogramas por ISRC, obra, status ou país
**Executado em:** 2026-04-10
**Status Geral:** FAIL

---

## Resumo

| Total | PASS | FAIL | N/A |
|-------|------|------|-----|
| 10    | 6    | 4    | 0   |

---

## Casos de Teste

### TC-02-01: Listar fonogramas sem filtros com paginação
- **Endpoint:** GET /api/v1/fonogramas?page=1&size=5
- **HTTP Esperado:** 200
- **HTTP Obtido:** 200
- **Status:** PASS
- **Observação:** Retornou 3 fonogramas, pagination com page/size/total/totalPages. Estrutura correta. Cada item inclui obra aninhada.

### TC-02-02: Filtro por ISRC parcial
- **Endpoint:** GET /api/v1/fonogramas?page=1&size=5&isrc=BRABC26
- **HTTP Esperado:** 200 com 2 resultados (apenas ISRCs contendo "BRABC26")
- **HTTP Obtido:** 200 com 3 resultados (todos os fonogramas — filtro ignorado)
- **Status:** FAIL
- **Bug:** Filtro ISRC completamente ignorado pela API. Confirmado com valor impossível "ZZZZZ" que também retorna todos os 3 registros. RF-08 não atendido.

### TC-02-03: Filtro por obraId
- **Endpoint:** GET /api/v1/fonogramas?page=1&size=5&obraId=23f131c1-...
- **HTTP Esperado:** 200 com apenas fonogramas da obra
- **HTTP Obtido:** 200 com 2 fonogramas (correto)
- **Status:** PASS
- **Observação:** Filtro por obraId funciona corretamente

### TC-02-04: Filtro por status
- **Endpoint:** GET /api/v1/fonogramas?page=1&size=5&status=PENDENTE_VALIDACAO
- **HTTP Esperado:** 200 com fonogramas no status indicado
- **HTTP Obtido:** 500 Internal Server Error
- **Status:** FAIL
- **Bug Crítico:** "Failed to bind parameter 'Nullable<StatusFonograma> Status' from 'PENDENTE_VALIDACAO'". O enum StatusFonograma não está sendo desserializado corretamente do query param. RF-08 não atendido.

### TC-02-05: Filtro por país parcial
- **Endpoint:** GET /api/v1/fonogramas?page=1&size=5&pais=Bras
- **HTTP Esperado:** 200 com fonogramas do Brasil
- **HTTP Obtido:** 200 com 1 resultado (correto — "Brasil")
- **Status:** PASS
- **Observação:** Filtro por país funciona corretamente (parcial, case-sensitive)

### TC-02-06: Filtro por obraTitulo parcial
- **Endpoint:** GET /api/v1/fonogramas?page=1&size=5&obraTitulo=Aquarela
- **HTTP Esperado:** 200 com fonogramas da Aquarela do Brasil
- **HTTP Obtido:** 200 com 2 resultados (correto)
- **Status:** PASS
- **Observação:** Filtro por título de obra funciona corretamente

### TC-02-07: Ordenação por ISRC DESC
- **Endpoint:** GET /api/v1/fonogramas?page=1&size=5&sort=isrc,desc
- **HTTP Esperado:** 200 com ISRCs em ordem decrescente (BRABC2600002, BRABC2600001, BRABC2300001)
- **HTTP Obtido:** 200 mas mesma ordem ascendente independente do parâmetro desc
- **Status:** FAIL
- **Bug:** Parâmetro de ordenação DESC ignorado. Tanto sort=isrc,asc quanto sort=isrc,desc retornam a mesma sequência (BRABC2300001, BRABC2600001, BRABC2600002). RF-07 parcialmente atendido (ordenação existe mas sentido não funciona).

### TC-02-08: Consultor pode listar fonogramas
- **Endpoint:** GET /api/v1/fonogramas (token consultor.teste)
- **HTTP Esperado:** 200
- **HTTP Obtido:** 200
- **Status:** PASS

### TC-02-09: Paginação (page=2, size=2)
- **Endpoint:** GET /api/v1/fonogramas?page=2&size=2
- **HTTP Esperado:** 200 com 1 item (total=3, page2 de tamanho 2 = 1 item)
- **HTTP Obtido:** 200 com page=2, size=2, total=3, count=1
- **Status:** PASS
- **Observação:** Paginação server-side funcionando corretamente — RF-06 atendido

### TC-02-10: Filtro ISRC com valor impossível
- **Endpoint:** GET /api/v1/fonogramas?page=1&size=10&isrc=ZZZZZ
- **HTTP Esperado:** 200 com 0 resultados
- **HTTP Obtido:** 200 com 3 resultados
- **Status:** FAIL
- **Observação:** Confirma que filtro ISRC está completamente não implementado ou ignorado no servidor

---

## Requisitos Verificados

| Requisito | Descrição | Status |
|-----------|-----------|--------|
| RF-06 | Paginação server-side (page/size) | PASS |
| RF-07 | Ordenação server-side (ISRC, padrão ASC funciona; DESC ignorado) | FAIL — DESC quebrado |
| RF-08 | Filtros: ISRC parcial (FAIL), obra ID (PASS), obra título (PASS), status (FAIL 500), país (PASS) | FAIL parcial |
| RF-09 | Listagem exibe ISRC formatado, obra, país, status, data lançamento | PASS |

---

## Bugs Encontrados

| ID | Severidade | Descrição |
|----|-----------|-----------|
| BUG-02-01 | Alta | Filtro ?isrc= completamente ignorado — qualquer valor retorna todos os registros |
| BUG-02-02 | Crítica | Filtro ?status= causa 500 — "Failed to bind parameter Nullable<StatusFonograma> from PENDENTE_VALIDACAO" |
| BUG-02-03 | Média | Parâmetro sort=isrc,desc ignorado — ordenação DESC não funciona, resultado idêntico ao ASC |
