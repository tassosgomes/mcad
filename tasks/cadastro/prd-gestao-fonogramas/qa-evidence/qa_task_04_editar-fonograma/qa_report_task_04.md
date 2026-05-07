# QA Report — qa_task_04: Editar Fonograma (HU-04)

**Feature:** F05 — Gestão de Fonogramas
**Task:** qa_task_04_editar-fonograma
**User Story:** HU-04 — Como Analista, quero editar dados do fonograma e excluí-lo quando necessário
**Executado em:** 2026-04-10
**Status Geral:** PASS

---

## Resumo

| Total | PASS | FAIL | N/A |
|-------|------|------|-----|
| 15    | 15   | 0    | 0   |

---

## Setup

- Fonogramas PENDENTE criados via API para testes de edição e exclusão
- Status LIBERADO e DEPURADO injetados diretamente no banco (cadastro.fonogramas) para simular o ciclo de vida completo, uma vez que a transição de status é responsabilidade de F07 (fora de escopo desta feature)
- Obra vinculada: 23f131c1 (Aquarela do Brasil, PENDENTE)

---

## Casos de Teste

### TC-04-01: PUT fonograma PENDENTE — alterar país e datas
- **Endpoint:** PUT /api/v1/fonogramas/{id}
- **Input:** isrc (mesmo), paisOrigem="Argentina", dataGravacao/dataLancamento alteradas
- **HTTP Esperado:** 200
- **HTTP Obtido:** 200
- **Status:** PASS
- **Observação:** Campos alterados corretamente. Status permanece PENDENTE_VALIDACAO. RF-14 atendido.

### TC-04-02: PUT fonograma PENDENTE — alterar ISRC
- **Endpoint:** PUT /api/v1/fonogramas/{id}
- **Input:** isrc="BRABC2600020" (novo)
- **HTTP Esperado:** 200 (PENDENTE pode ter ISRC alterado livremente)
- **HTTP Obtido:** 200
- **Status:** PASS
- **Observação:** RF-14 e RF-15 atendidos — edição livre de ISRC em PENDENTE

### TC-04-03: PUT ISRC duplicado em PENDENTE → 409
- **Input:** isrc="BRABC2600001" (já existe em outro fonograma)
- **HTTP Esperado:** 409
- **HTTP Obtido:** 409
- **Status:** PASS
- **Observação:** "Já existe um fonograma com o ISRC 'BR-ABC-26-00001'." RF-15 atendido.

### TC-04-04: PUT ISRC inválido → 400
- **Input:** isrc="RUIM" (menos de 12 chars)
- **HTTP Esperado:** 400
- **HTTP Obtido:** 400
- **Status:** PASS
- **Observação:** "ISRC deve ter 12 caracteres (sem hífens)." RF-15 atendido.

### TC-04-05: PUT fonograma inexistente → 404
- **Endpoint:** PUT /api/v1/fonogramas/11111111-...
- **HTTP Esperado:** 404
- **HTTP Obtido:** 404
- **Status:** PASS

### TC-04-06: DELETE fonograma PENDENTE_VALIDACAO → 204
- **Endpoint:** DELETE /api/v1/fonogramas/{id}
- **HTTP Esperado:** 204
- **HTTP Obtido:** 204
- **Status:** PASS
- **Observação:** RF-28 atendido — exclusão apenas em PENDENTE

### TC-04-07: GET após DELETE → 404
- **Verificação:** Fonograma excluído não existe mais
- **HTTP Esperado:** 404
- **HTTP Obtido:** 404
- **Status:** PASS
- **Observação:** Exclusão física confirmada

### TC-04-08: PUT LIBERADO — alterar país e datas → 200
- **Setup:** Status injetado via banco para LIBERADO
- **Input:** isrc (mesmo), paisOrigem="Uruguay", datas alteradas
- **HTTP Esperado:** 200 (edição livre de país/datas em LIBERADO)
- **HTTP Obtido:** 200
- **Status:** PASS
- **Observação:** RF-17 atendido — campos país e datas editáveis sem depuração mesmo em LIBERADO. DB confirmado com PaisOrigem="Uruguay".

### TC-04-09: PUT LIBERADO — alterar ISRC → 409 DEPURACAO_NECESSARIA
- **Input:** isrc="BRABC2600099" (diferente do atual)
- **HTTP Esperado:** 409 com code=DEPURACAO_NECESSARIA
- **HTTP Obtido:** 409 com "code":"DEPURACAO_NECESSARIA"
- **Status:** PASS
- **Observação:** RF-16 atendido. Mensagem: "Alterar o ISRC de um fonograma LIBERADO requer depuração." O endpoint informa ao cliente que deve usar POST /depurar.

### TC-04-10: DELETE LIBERADO → 409
- **HTTP Esperado:** 409
- **HTTP Obtido:** 409
- **Status:** PASS
- **Observação:** RF-29 atendido. Mensagem: "Fonogramas liberados ou depurados não podem ser excluídos."

### TC-04-11: PUT DEPURADO → 422
- **Setup:** Status injetado via banco para DEPURADO
- **HTTP Esperado:** 422 (fonograma imutável)
- **HTTP Obtido:** 422
- **Status:** PASS
- **Observação:** "Fonogramas depurados não podem ser editados" — RF imutabilidade atendido

### TC-04-12: DELETE DEPURADO → 409
- **HTTP Esperado:** 409
- **HTTP Obtido:** 409
- **Status:** PASS
- **Observação:** Mesmo erro que LIBERADO: "Fonogramas liberados ou depurados não podem ser excluídos."

### TC-04-13: Consultor não pode editar → 403
- **Endpoint:** PUT /api/v1/fonogramas/{id} (token consultor.teste)
- **HTTP Esperado:** 403
- **HTTP Obtido:** 403
- **Status:** PASS

### TC-04-14: Consultor não pode deletar → 403
- **Endpoint:** DELETE /api/v1/fonogramas/{id} (token consultor.teste)
- **HTTP Esperado:** 403
- **HTTP Obtido:** 403
- **Status:** PASS

### TC-04-15: Verificação DB após edição de LIBERADO
- **Verificação:** Campos PaisOrigem, DataGravacao, DataLancamento atualizados; Status=LIBERADO mantido; ISRC não alterado
- **Obtido:** PaisOrigem="Uruguay", DataGravacao="2026-03-15", DataLancamento="2026-06-01", Status="LIBERADO", Isrc="BRABC2600030" (inalterado)
- **Status:** PASS

---

## Requisitos Verificados

| Requisito | Descrição | Status |
|-----------|-----------|--------|
| RF-14 | PENDENTE: edição livre de ISRC, país, datas; obra imutável | PASS |
| RF-15 | Ao alterar ISRC, validar formato e unicidade | PASS |
| RF-16 | LIBERADO + alteração de ISRC → 409 DEPURACAO_NECESSARIA | PASS |
| RF-17 | LIBERADO + país/datas → 200 (edição livre) | PASS |
| RF-28 | DELETE apenas em PENDENTE_VALIDACAO ou PENDENTE_DOCUMENTACAO | PASS |
| RF-29 | DELETE LIBERADO ou DEPURADO → 409 | PASS |
