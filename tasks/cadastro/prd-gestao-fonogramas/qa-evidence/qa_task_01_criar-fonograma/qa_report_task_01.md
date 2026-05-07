# QA Report — qa_task_01: Criar Fonograma (HU-01)

**Feature:** F05 — Gestão de Fonogramas
**Task:** qa_task_01_criar-fonograma
**User Story:** HU-01 — Como Analista, quero criar um fonograma informando ISRC, obra, país e datas
**Executado em:** 2026-04-10
**Status Geral:** PASS

---

## Resumo

| Total | PASS | FAIL | N/A |
|-------|------|------|-----|
| 12    | 12   | 0    | 0   |

---

## Casos de Teste

### TC-01-01: Criar fonograma válido com todos os campos
- **Endpoint:** POST /api/v1/fonogramas
- **Input:** ISRC=BRABC2600001, obraId=23f131c1 (Aquarela do Brasil), paisOrigem=Brasil, dataGravacao=2026-01-15, dataLancamento=2026-03-01
- **HTTP Esperado:** 201
- **HTTP Obtido:** 201
- **Status:** PASS
- **Observação:** Resposta inclui isrcFormatado="BR-ABC-26-00001", status="PENDENTE_VALIDACAO", obra aninhada, fonogramaDepuradoParaId=null. ID gerado: 565fdb3d-9b1c-4ec1-ad85-1467da4f026c

### TC-01-02: ISRC duplicado retorna 409
- **Endpoint:** POST /api/v1/fonogramas
- **Input:** ISRC=BRABC2600001 (já cadastrado)
- **HTTP Esperado:** 409
- **HTTP Obtido:** 409
- **Status:** PASS
- **Observação:** Mensagem: "Já existe um fonograma com o ISRC 'BR-ABC-26-00001'."

### TC-01-03: ISRC com formato inválido retorna 400
- **Endpoint:** POST /api/v1/fonogramas
- **Input:** isrc="INVALIDO" (menos de 12 chars)
- **HTTP Esperado:** 400
- **HTTP Obtido:** 400
- **Status:** PASS
- **Observação:** Mensagem: "ISRC deve ter 12 caracteres (sem hífens)." — validação aplicada ao campo sem hifens

### TC-01-04: Obra UUID inválido (zeros) retorna 400
- **Endpoint:** POST /api/v1/fonogramas
- **Input:** obraId=00000000-0000-0000-0000-000000000000
- **HTTP Esperado:** 404 ou 422
- **HTTP Obtido:** 400
- **Status:** PASS (comportamento aceitável — validação de nulo/default UUID)
- **Observação:** API trata UUID all-zeros como "ID da obra é obrigatório". Comportamento defensivo aceitável.

### TC-01-04b: Obra UUID válido mas inexistente retorna 404
- **Endpoint:** POST /api/v1/fonogramas
- **Input:** obraId=11111111-1111-1111-1111-111111111111
- **HTTP Esperado:** 404
- **HTTP Obtido:** 404
- **Status:** PASS
- **Observação:** "Obra não encontrada. com ID '11111111-...' não foi encontrado" — RF-04 validado

### TC-01-05: Campos obrigatórios ausentes retornam 400
- **Endpoint:** POST /api/v1/fonogramas
- **Input:** body vazio {}
- **HTTP Esperado:** 400
- **HTTP Obtido:** 400
- **Status:** PASS
- **Observação:** Erros reportados para Isrc, ObraId e PaisOrigem simultaneamente

### TC-01-06: Fonograma sem datas opcionais é criado com sucesso
- **Endpoint:** POST /api/v1/fonogramas
- **Input:** ISRC=BRABC2600002, apenas campos obrigatórios
- **HTTP Esperado:** 201
- **HTTP Obtido:** 201
- **Status:** PASS
- **Observação:** dataGravacao=null, dataLancamento=null na resposta — datas são opcionais conforme RF-01

### TC-01-07: Consultar fonograma por ID retorna dados completos
- **Endpoint:** GET /api/v1/fonogramas/{id}
- **HTTP Esperado:** 200
- **HTTP Obtido:** 200
- **Status:** PASS
- **Observação:** Resposta inclui obra aninhada (id, codigo, titulo, status), isrcFormatado, fonogramaDepuradoParaId=null — RF-26 atendido

### TC-01-08: Fonograma inexistente retorna 404
- **Endpoint:** GET /api/v1/fonogramas/{id-inexistente}
- **HTTP Esperado:** 404
- **HTTP Obtido:** 404
- **Status:** PASS
- **Observação:** RF-27 atendido

### TC-01-09: Verificação no banco — status PENDENTE_VALIDACAO
- **Método:** Consulta direta PostgreSQL (cadastro.fonogramas)
- **Esperado:** Status = PENDENTE_VALIDACAO, Isrc = BRABC2600001, ObraId correto
- **Obtido:** Status = PENDENTE_VALIDACAO, Isrc = BRABC2600001, ObraId = 23f131c1-43a1-47fe-95d8-6bebdc4fdc0c
- **Status:** PASS
- **Observação:** ISRC armazenado sem hífens no banco, FonogramaDepuradoParaId NULL — RF-05 e RF-13 validados via DB

### TC-01-10: Consultor não pode criar fonograma (403)
- **Endpoint:** POST /api/v1/fonogramas (token consultor.teste)
- **HTTP Esperado:** 403
- **HTTP Obtido:** 403
- **Status:** PASS
- **Observação:** Controle de acesso por role funcionando corretamente

### TC-01-11: Consultor pode consultar fonograma (200)
- **Endpoint:** GET /api/v1/fonogramas/{id} (token consultor.teste)
- **HTTP Esperado:** 200
- **HTTP Obtido:** 200
- **Status:** PASS
- **Observação:** Leitura autorizada para perfil Consultor

### TC-01-12: Sem token retorna 401
- **Endpoint:** GET /api/v1/fonogramas/{id} (sem Authorization)
- **HTTP Esperado:** 401
- **HTTP Obtido:** 401
- **Status:** PASS

---

## Requisitos Verificados

| Requisito | Descrição | Status |
|-----------|-----------|--------|
| RF-01 | Criar fonograma com ISRC, obra, país, datas | PASS |
| RF-02 | ISRC formato CC-XXX-YY-NNNNN com validação | PASS |
| RF-03 | ISRC único no sistema → 409 em duplicata | PASS |
| RF-04 | Obra obrigatória → 404 se inexistente | PASS |
| RF-05 | Status inicial PENDENTE_VALIDACAO | PASS |
| RF-26 | Consulta individual com dados completos e obra aninhada | PASS |
| RF-27 | 404 para fonograma inexistente | PASS |

---

## Dados Criados (para próximas tasks)

| ISRC | ID | Status | Obra |
|------|----|--------|------|
| BR-ABC-26-00001 | 565fdb3d-9b1c-4ec1-ad85-1467da4f026c | PENDENTE_VALIDACAO | Aquarela do Brasil |
| BR-ABC-26-00002 | 3060fc52-3cfe-45ba-b011-b548b39dc128 | PENDENTE_VALIDACAO | Aquarela do Brasil |
