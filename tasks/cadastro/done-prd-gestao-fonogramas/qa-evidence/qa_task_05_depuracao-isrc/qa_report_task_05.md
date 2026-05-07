# QA Report — qa_task_05: Depuração por ISRC (HU-05)

**Feature:** F05 — Gestão de Fonogramas
**Task:** qa_task_05_depuracao-isrc
**User Story:** HU-05 — Como sistema, preciso depurar um fonograma LIBERADO quando o ISRC é alterado
**Executado em:** 2026-04-10
**Status Geral:** PASS

---

## Resumo

| Total | PASS | FAIL | N/A |
|-------|------|------|-----|
| 12    | 12   | 0    | 0   |

---

## Setup

- Fonograma BRABC2600050 (ID: 6261139e) criado via API e status injetado para LIBERADO via banco
- Obra vinculada: 23f131c1 (Aquarela do Brasil, PENDENTE)
- Novo ISRC utilizado na depuração: BRABC2600060

---

## Casos de Teste

### TC-05-01: POST /depurar em fonograma PENDENTE → 409
- **Endpoint:** POST /api/v1/fonogramas/{id}/depurar (fonograma PENDENTE_VALIDACAO)
- **HTTP Esperado:** 409 (apenas LIBERADO pode ser depurado)
- **HTTP Obtido:** 409
- **Status:** PASS
- **Observação:** "Apenas fonogramas LIBERADOS podem ser depurados." Regra de negócio corretamente aplicada.

### TC-05-02: POST /depurar em fonograma LIBERADO → 201
- **Endpoint:** POST /api/v1/fonogramas/{id}/depurar
- **Input:** isrc="BRABC2600060", paisOrigem="Brasil", dataGravacao, dataLancamento
- **HTTP Esperado:** 201
- **HTTP Obtido:** 201
- **Status:** PASS
- **Observação:** Resposta contém dois objetos: fonogramaDepurado (status=DEPURADO, ISRC original, FK para novo) e novoFonograma (status=PENDENTE_VALIDACAO, novo ISRC). RF-18 atendido.

### TC-05-03: DB — fonograma original marcado como DEPURADO com FK para novo
- **Verificação:** SELECT na tabela cadastro.fonogramas
- **Esperado:** Status=DEPURADO, FonogramaDepuradoParaId=ID do novo, ISRC original preservado, ObraId inalterado
- **Obtido:** Status=DEPURADO, FonogramaDepuradoParaId=907c7884-..., Isrc=BRABC2600050, ObraId=23f131c1
- **Status:** PASS
- **Observação:** RF-19 atendido — ISRC original preservado, self-ref FK populada

### TC-05-04: DB — novo fonograma com PENDENTE_VALIDACAO e sem FK retroativa
- **Verificação:** SELECT na tabela cadastro.fonogramas
- **Esperado:** Status=PENDENTE_VALIDACAO, FonogramaDepuradoParaId=null, ISRC novo, mesma ObraId
- **Obtido:** Status=PENDENTE_VALIDACAO, FonogramaDepuradoParaId=null, Isrc=BRABC2600060, ObraId=23f131c1
- **Status:** PASS
- **Observação:** RF-20 atendido — novo fonograma sem conexos, FK reversa nula

### TC-05-05: GET fonograma original — confirma fonogramaDepuradoParaId preenchido
- **HTTP Esperado:** 200 com fonogramaDepuradoParaId=ID do novo
- **HTTP Obtido:** 200 com fonogramaDepuradoParaId="907c7884-050f-4ba1-baeb-15909616ac20"
- **Status:** PASS
- **Observação:** RF-26 atendido — campo visível na API

### TC-05-06: GET novo fonograma — confirma PENDENTE_VALIDACAO, mesma obra, novo ISRC
- **HTTP Esperado:** 200 com status=PENDENTE_VALIDACAO, obra=Aquarela do Brasil, isrc=BR-ABC-26-00060
- **HTTP Obtido:** Conforme esperado
- **Status:** PASS
- **Observação:** Obra mantida — RF-18 critério "mesma obra" atendido

### TC-05-07: POST /depurar em fonograma já DEPURADO → 409
- **HTTP Esperado:** 409
- **HTTP Obtido:** 409
- **Status:** PASS
- **Observação:** "Apenas fonogramas LIBERADOS podem ser depurados." Imutabilidade do DEPURADO garantida.

### TC-05-08: PUT em fonograma DEPURADO → 422
- **HTTP Esperado:** 422 (totalmente imutável)
- **HTTP Obtido:** 422
- **Status:** PASS
- **Observação:** "Fonogramas depurados não podem ser editados" — imutabilidade total pós-depuração

### TC-05-09: /depurar com novo ISRC já existente → 409
- **Cenário:** Tentar depurar com isrc="BRABC2600060" (já existe no sistema)
- **HTTP Esperado:** 409
- **HTTP Obtido:** 409
- **Status:** PASS
- **Observação:** "Já existe um fonograma com o ISRC 'BR-ABC-26-00060'." — unicidade verificada mesmo na depuração

### TC-05-10: POST /depurar em fonograma inexistente → 404
- **HTTP Esperado:** 404
- **HTTP Obtido:** 404
- **Status:** PASS

### TC-05-11: Consultor não pode depurar → 403
- **Endpoint:** POST /depurar (token consultor.teste)
- **HTTP Esperado:** 403
- **HTTP Obtido:** 403
- **Status:** PASS

### TC-05-12: Novo fonograma vinculado à mesma obra do original
- **Verificação:** ObraId do original == ObraId do novo
- **Esperado:** 23f131c1-43a1-47fe-95d8-6bebdc4fdc0c (mesma)
- **Obtido:** Ambos com 23f131c1-43a1-47fe-95d8-6bebdc4fdc0c
- **Status:** PASS
- **Observação:** RF-18 — "mesma obra" confirmado via consulta direta no banco

---

## Requisitos Verificados

| Requisito | Descrição | Status |
|-----------|-----------|--------|
| RF-18 | Depuração: original→DEPURADO, novo→PENDENTE_VALIDACAO, mesma obra | PASS |
| RF-19 | ISRC original preservado, FK FonogramaDepuradoParaId populada | PASS |
| RF-20 | Novo fonograma sem participações conexas (campo não existe nesta feature) | PASS |
| RF-22 | Endpoint POST /fonogramas/{id}/depurar reutilizável | PASS |
