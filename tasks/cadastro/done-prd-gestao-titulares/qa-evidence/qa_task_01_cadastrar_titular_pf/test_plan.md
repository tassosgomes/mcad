# Plano de Testes — HU-01: Cadastrar Titular Pessoa Física

**Task ID:** qa_task_01
**Tipos:** API, Banco

---

## Casos de Teste

### CT-01: Happy path — criar PF com dados válidos
- **Pré-condição:** Associação disponível via GET /associacoes; CPF 29376160027 não existe no sistema
- **Passos:**
  1. GET /api/v1/associacoes para obter ID da primeira associação
  2. POST /api/v1/titulares com nome="Maria Silva QA", tipo="PF", documento="29376160027", nacionalidade="Brasileira", associacaoId=<id obtido>, sem caeIpi
- **Expected:** HTTP 201, body com id (uuid), nome="Maria Silva QA", tipo="PF", status="ATIVO", documentoFormatado="293.761.600-27", header Location presente
- **Tipo:** API

---

### CT-02: CPF inválido — todos dígitos iguais (sequência inválida)
- **Pré-condição:** Token válido
- **Passos:**
  1. POST /api/v1/titulares com documento="11111111111", tipo="PF", todos outros campos válidos
- **Expected:** HTTP 400 ou 422 com mensagem indicando CPF inválido
- **Tipo:** API

---

### CT-03: CPF inválido — dígitos verificadores errados
- **Pré-condição:** Token válido
- **Passos:**
  1. POST /api/v1/titulares com documento="12345678901", tipo="PF", todos outros campos válidos
- **Expected:** HTTP 400 ou 422
- **Tipo:** API

---

### CT-04: CPF duplicado (unicidade RF-05)
- **Pré-condição:** CT-01 executado com sucesso (CPF 29376160027 já cadastrado)
- **Passos:**
  1. POST /api/v1/titulares com o mesmo documento="29376160027"
- **Expected:** HTTP 409 Conflict com mensagem sobre duplicidade
- **Tipo:** API

---

### CT-05: Campo obrigatório ausente — sem nome
- **Pré-condição:** Token válido, associação disponível
- **Passos:**
  1. POST /api/v1/titulares sem o campo "nome", todos outros campos válidos
- **Expected:** HTTP 400 ou 422
- **Tipo:** API

---

### CT-06: Campo obrigatório ausente — sem associacaoId
- **Pré-condição:** Token válido
- **Passos:**
  1. POST /api/v1/titulares sem o campo "associacaoId", todos outros campos válidos
- **Expected:** HTTP 400 ou 422
- **Tipo:** API

---

### CT-07: Campo obrigatório ausente — sem nacionalidade
- **Pré-condição:** Token válido
- **Passos:**
  1. POST /api/v1/titulares sem o campo "nacionalidade", todos outros campos válidos
- **Expected:** HTTP 400 ou 422
- **Tipo:** API

---

### CT-08: Status default é ATIVO
- **Pré-condição:** CT-01 executado com sucesso
- **Passos:**
  1. Verificar no response do CT-01 que campo status = "ATIVO"
- **Expected:** status="ATIVO" (sem envio explícito do campo)
- **Tipo:** API (validação do response do CT-01)

---

### CT-09: CAE/IPI opcional — com valor
- **Pré-condição:** Token válido, associação disponível
- **Passos:**
  1. POST /api/v1/titulares com CPF=52998224725, caeIpi="CAE123456", todos campos obrigatórios preenchidos
- **Expected:** HTTP 201, body inclui caeIpi="CAE123456"
- **Tipo:** API

---

### CT-10: Criar PF sem CAE/IPI
- **Pré-condição:** Token válido, associação disponível
- **Passos:**
  1. POST /api/v1/titulares com CPF=83456209078, sem campo caeIpi
- **Expected:** HTTP 201, body com caeIpi null ou ausente
- **Tipo:** API

---

### CT-11: Validação de banco — registro persistido corretamente
- **Pré-condição:** CT-01 executado com sucesso
- **Passos:**
  1. Query no banco: SELECT id, nome, tipo, documento, status, associacao_id FROM cadastro.titulares WHERE documento='29376160027'
- **Expected:** Registro encontrado com status='ATIVO', tipo='PF', nome='Maria Silva QA'
- **Tipo:** Banco
