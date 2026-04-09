# Plano de Testes — HU-05: Visualizar Titular

**Task ID:** qa_task_05
**Tipos:** API

---

## Casos de Teste

### CT-01: Visualizar titular existente com perfil Analista
- **Pre-condicao:** Titular PF criado via POST /titulares com token de analista
- **Passos:**
  1. GET /api/v1/titulares/{id} com token de analista
- **Expected:** HTTP 200, response com campos: id, nome, tipo, documento, documentoFormatado, nacionalidade, caeIpi, associacao (id, sigla, nome), status, criadoEm, atualizadoEm
- **Tipo:** API

### CT-02: Visualizar titular existente com perfil Consultor
- **Pre-condicao:** Titular PF criado no CT-01 ainda existe; token de consultor obtido
- **Passos:**
  1. GET /api/v1/titulares/{id} com token de consultor
- **Expected:** HTTP 200, mesmos dados que CT-01 (acesso read-only permitido)
- **Tipo:** API

### CT-03: Titular inexistente retorna 404
- **Pre-condicao:** UUID 00000000-0000-0000-0000-000000000000 nao existe no banco
- **Passos:**
  1. GET /api/v1/titulares/00000000-0000-0000-0000-000000000000 com token de analista
- **Expected:** HTTP 404, body com "title": "Resource Not Found" e "detail" contendo "nao foi encontrado"
- **Tipo:** API

### CT-04: ID com formato invalido (nao UUID)
- **Pre-condicao:** Nenhuma
- **Passos:**
  1. GET /api/v1/titulares/invalid-id com token de analista
- **Expected:** HTTP 400 ou 404
- **Tipo:** API

### CT-05: Validacao de todos os campos do response (RF-21)
- **Pre-condicao:** Response 200 do CT-01 disponivel
- **Passos:**
  1. Verificar presenca e tipos de: id (uuid), nome (string), tipo (PF), documento (string sem formatacao), documentoFormatado (string formatada com pontos/hifen), nacionalidade, caeIpi (string ou null), associacao.id, associacao.sigla, associacao.nome, status (ATIVO), criadoEm (ISO 8601), atualizadoEm (ISO 8601)
- **Expected:** Todos os campos presentes e nos formatos corretos
- **Tipo:** API

### CT-06: Consultor NAO pode criar titular (write denied)
- **Pre-condicao:** Token de consultor obtido
- **Passos:**
  1. POST /api/v1/titulares com token de consultor e payload valido de PF
- **Expected:** HTTP 403 Forbidden
- **Tipo:** API

### CT-07: Consultor NAO pode editar titular (write denied)
- **Pre-condicao:** Titular PF criado; token de consultor obtido
- **Passos:**
  1. PUT /api/v1/titulares/{id} com token de consultor e payload valido
- **Expected:** HTTP 403 Forbidden
- **Tipo:** API

### CT-08: Consultor NAO pode excluir titular (write denied)
- **Pre-condicao:** Titular PF criado; token de consultor obtido
- **Passos:**
  1. DELETE /api/v1/titulares/{id} com token de consultor
- **Expected:** HTTP 403 Forbidden
- **Tipo:** API

---

## Cleanup
- DELETE /api/v1/titulares/{id} com token de analista apos todos os testes
