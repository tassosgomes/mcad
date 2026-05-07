# QA Report — qa_task_03: Fonogramas na Obra (HU-03)

**Feature:** F05 — Gestão de Fonogramas
**Task:** qa_task_03_fonogramas-na-obra
**User Story:** HU-03 — Como Analista, quero ver a lista de fonogramas vinculados a uma obra
**Executado em:** 2026-04-10
**Status Geral:** PASS

---

## Resumo

| Total | PASS | FAIL | N/A |
|-------|------|------|-----|
| 6     | 6    | 0    | 0   |

---

## Casos de Teste

### TC-03-01: Listar fonogramas de obra com registros
- **Endpoint:** GET /api/v1/obras/{obraId}/fonogramas
- **obraId:** 23f131c1 (Aquarela do Brasil)
- **HTTP Esperado:** 200 com array de fonogramas
- **HTTP Obtido:** 200
- **Status:** PASS
- **Observação:** Retornou 2 fonogramas (BR-ABC-26-00001 e BR-ABC-26-00002) — ambos criados no qa_task_01. Campos: id, codigo, isrcFormatado, status, paisOrigem, dataLancamento.

### TC-03-02: Obra sem fonogramas retorna array vazio
- **Endpoint:** GET /api/v1/obras/837f0236 (Meu Caro Amigo)/fonogramas
- **HTTP Esperado:** 200 com []
- **HTTP Obtido:** 200 com []
- **Status:** PASS
- **Observação:** Resposta correta para obra sem fonogramas — não retorna 404

### TC-03-03: Obra inexistente retorna 404
- **Endpoint:** GET /api/v1/obras/11111111-1111-1111-1111-111111111111/fonogramas
- **HTTP Esperado:** 404
- **HTTP Obtido:** 404
- **Status:** PASS
- **Observação:** "Obra não encontrada. com ID '11111111-...' não foi encontrado"

### TC-03-04: Resposta é array sem paginação
- **Verificação:** type=array, sem objeto pagination
- **Esperado:** Array puro conforme RF-10/spec
- **Obtido:** Array com 2 itens, type="array" confirmado pelo jq
- **Status:** PASS
- **Observação:** Campos do item: codigo, dataLancamento, id, isrcFormatado, paisOrigem, status — compacto para listagem na seção de obra

### TC-03-05: Consultor pode acessar fonogramas da obra
- **Endpoint:** GET /api/v1/obras/{obraId}/fonogramas (token consultor.teste)
- **HTTP Esperado:** 200
- **HTTP Obtido:** 200
- **Status:** PASS

### TC-03-06: Obra DEPURADA retorna fonogramas (ou array vazio se não houver)
- **Endpoint:** GET /api/v1/obras/9f5729f0 (Garota de Ipanema DEPURADA)/fonogramas
- **HTTP Esperado:** 200 (leitura permitida mesmo em DEPURADA)
- **HTTP Obtido:** 200 com []
- **Status:** PASS
- **Observação:** RF-13 — para obras DEPURADAS a seção é read-only. A API retorna 200 (não bloqueia leitura), conforme esperado. A obra não possui fonogramas vinculados a ela.

---

## Requisitos Verificados

| Requisito | Descrição | Status |
|-----------|-----------|--------|
| RF-10 | Seção "Fonogramas" exibe lista de fonogramas vinculados à obra | PASS |
| RF-13 | Para obras DEPURADAS, seção é read-only (API retorna 200, não bloqueia GET) | PASS |
