# QA Report — Task 01: Cadastrar Titular Pessoa Física

**Task ID:** qa_task_01  
**User Story:** HU-01 — Cadastrar titular pessoa física — validação CPF, unicidade, status default ATIVO  
**Data de execução:** 2026-04-08  
**Executado por:** QA Orchestrator (re-execução pós-correção de bugs)  
**Status geral:** PASS

---

## Resumo

| Métrica | Valor |
|---------|-------|
| Total de TCs | 7 |
| PASS | 7 |
| FAIL | 0 |
| Cobertura | RF-01, RF-02, RF-04, RF-05, RF-06, RF-07, RF-08 |

---

## Casos de Teste

### TC01-01 — Criar PF válido (CPF 987.654.321-00)
**Tipo:** API + DB  
**Status:** PASS  
**Descrição:** POST /api/v1/titulares com todos os campos obrigatórios, CPF válido.  
**Evidência:**
- HTTP 201 Created
- ID retornado: `c22a4093-285c-4b07-b5bf-4ca8f80feeed`
- `documentoFormatado`: `987.654.321-00`
- `status`: `ATIVO` (default confirmado — RF-08)
- `associacao.sigla`: `ABRAMUS`
- Todos os campos obrigatórios presentes no response (RF-01)

---

### TC01-02 — CPF inválido (dígitos verificadores errados)
**Tipo:** API  
**Status:** PASS  
**Descrição:** POST com CPF `98765432199` (dígitos verificadores incorretos).  
**Evidência:**
- HTTP 422 Unprocessable Entity
- `detail`: `"CPF inválido"` (RF-02, RF-04)

---

### TC01-03 — CPF duplicado
**Tipo:** API  
**Status:** PASS  
**Descrição:** Tentativa de criar segundo titular com mesmo CPF `98765432100`.  
**Evidência:**
- HTTP 409 Conflict
- `detail`: `"Já existe um titular cadastrado com este PF: 987.654.321-00"` (RF-05)
- Mensagem em português

---

### TC01-04 — Campo obrigatório ausente (associacaoId)
**Tipo:** API  
**Status:** PASS  
**Descrição:** POST sem `associacaoId`.  
**Evidência:**
- HTTP 400 Bad Request
- `title`: `"Validation Error"` (RF-06)

---

### TC01-05 — Persistência no banco de dados
**Tipo:** DB  
**Status:** PASS  
**Descrição:** GET /api/v1/titulares/{id} para confirmar persistência.  
**Evidência:**
- HTTP 200
- `status`: `ATIVO`
- `documento`: `98765432100`
- `tipo`: `PF`
- Dados consistentes com o POST

---

### TC01-06 — Status default ATIVO
**Tipo:** API  
**Status:** PASS  
**Descrição:** Verificar que titular criado sem informar status tem `status = ATIVO`.  
**Evidência:**
- `status`: `ATIVO` no response do POST (RF-08)

---

### TC01-07 — Criar segundo PF com CAE/IPI e associação UBC
**Tipo:** API  
**Status:** PASS  
**Descrição:** POST com CPF `11122233396`, associação UBC e CAE/IPI `QA99901`.  
**Evidência:**
- HTTP 201 Created
- ID: `1e1dace1-0980-476d-9abb-1a2bc4d6a332`
- `caeIpi`: `QA99901` (RF-09 — campo opcional funciona)

---

## Dados Criados (para uso em tasks posteriores)

| Variável | Valor |
|----------|-------|
| PF_ID_01 | `c22a4093-285c-4b07-b5bf-4ca8f80feeed` |
| PF_ID_02 | `1e1dace1-0980-476d-9abb-1a2bc4d6a332` |
| CPF_01 | `98765432100` |
| CPF_02 | `11122233396` |

---

## Bugs Identificados

Nenhum novo bug encontrado nesta task.

---

## Conclusão

Todos os requisitos de HU-01 foram validados com sucesso. A validação de CPF (módulo 11), unicidade de documento, status default ATIVO, obrigatoriedade dos campos e persistência no banco estão funcionando corretamente.
