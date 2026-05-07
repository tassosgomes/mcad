# QA Retest Report v3 — F04 Titularidades Autorais

**Data/Hora:** 2026-04-10T15:30:00Z (aproximado)
**Status Geral:** FAIL
**Ambiente:** http://localhost:5001/api/v1
**Autenticacao:** Keycloak JWT (analista.teste)
**Log de evidencias:** `retest_v3_requests.log`

---

## Verificacao inicial da API

GET /api/v1/obras → HTTP 200, retornou 34 obras paginadas. API operacional.

---

## Resumo dos 3 Retestes

| Item | Descricao | Status |
|------|-----------|--------|
| FAIL-01 | RF-23: Titularidades copiadas na depuracao | FAIL |
| DIV-02 | HTTP 422 para validacao de percentual invalido | FAIL |
| DIV-03 | Busca de titular por documento CPF/CNPJ | PARCIAL (2 PASS / 1 FAIL) |

---

## FAIL-01 — RF-23: Titularidades copiadas na depuracao

### Execucao

**Passo 1 — Criar obra PENDENTE**
- POST /obras `{"titulo":"Obra Reteste v3 RF23","tipo":"MUSICAL","genero":"MPB"}`
- Status: 201
- Obra ID criada: `30bbcb6d-6a99-4347-8fe9-3b3048ded075`

**Passo 2 — Adicionar titularidade AUTOR 60%**
- POST /obras/30bbcb6d.../titularidades `{titularId: de9f6d12... (Gomes Silva Tasso), categoria: AUTOR, percentual: 60}`
- Nota: campo correto e `categoria` (nao `papel`), como confirmado via inspecao de erro 400 anterior
- Status: 201
- Titularidade ID: `f9747f48-6423-4c61-ae8b-c5f23f2016ca`

**Passo 3 — Adicionar titularidade EDITOR 40%**
- POST /obras/30bbcb6d.../titularidades `{titularId: 500bbe2d... (QA Editora Numerica), categoria: EDITOR, percentual: 40}`
- Status: 201
- Titularidade ID: `c002b123-4e2c-4af3-ab8a-6ed78d00455a`

**Verificacao das titularidades originais:**
- GET /obras/30bbcb6d.../titularidades → HTTP 200
- `somaPercentual: 100.0000`, `somaCompleta: true`
- 2 titularidades presentes (AUTOR 60% + EDITOR 40%)

**Passo 4 — Atualizar status para LIBERADO via banco**
- SQL: `UPDATE cadastro.obras_musicais SET "Status" = 'LIBERADO' WHERE "Id" = '30bbcb6d-6a99-4347-8fe9-3b3048ded075'`
- Retorno: `30bbcb6d-6a99-4347-8fe9-3b3048ded075|LIBERADO` — UPDATE 1
- SELECT confirmatorio: `LIBERADO`

**Passo 5 — POST /depurar**
- POST /obras/30bbcb6d.../depurar `{}`
- Status: **500**
- Body:
  ```json
  {
    "title": "Internal Server Error",
    "status": 500,
    "detail": "Object reference not set to an instance of an object.",
    "instance": "/api/v1/obras/30bbcb6d-6a99-4347-8fe9-3b3048ded075/depurar"
  }
  ```

### Stack trace (log da API)

```
System.NullReferenceException: Object reference not set to an instance of an object.
   at Cadastro.Application.Obras.Commands.DepurarObraCommandHandler.HandleAsync(
      DepurarObraCommand request, CancellationToken cancellationToken)
   in DepurarObraCommand.cs:line 32
```

### Resultado

**Expected:** HTTP 200 + nova obra criada + GET /novaObra/titularidades retorna as 2 titularidades copiadas (AUTOR 60% + EDITOR 40%)

**Actual:** HTTP 500 — NullReferenceException em `DepurarObraCommandHandler.HandleAsync` na linha 32 de `DepurarObraCommand.cs`

**Status: FAIL**

Execucao interrompida — passos 6 e 7 (verificacao das titularidades na nova obra e validacao no banco) nao foram executados.

---

## DIV-02 — HTTP 422 para validacao de percentual

### Obra utilizada para teste

Obra PENDENTE existente: `837f0236-02e3-4e10-abe3-0e8babad6ced` (Meu Caro Amigo, codigo 11)
Titular utilizado para POST: `de9f6d12-a4c8-4489-800f-cfa330afac6f` (Gomes Silva Tasso)
Titularidade para PUT: `f9747f48-6423-4c61-ae8b-c5f23f2016ca` (obra 30bbcb6d)

### Resultados por cenario

| CT | Operacao | Input | Expected | Actual | Detalhe | Status |
|----|----------|-------|----------|--------|---------|--------|
| CT-01 | POST | percentual=0 | 422 | **400** | `'Percentual' must be greater than '0'.` | FAIL |
| CT-02 | POST | percentual=-5 | 422 | **400** | `'Percentual' must be greater than '0'.` | FAIL |
| CT-03 | POST | percentual=150 | 422 | **400** | `'Percentual' must be less than or equal to '100'.` | FAIL |
| CT-04 | PUT | percentual=0 | 422 | **400** | `'Percentual' must be greater than '0'.` | FAIL |
| CT-05 | PUT | percentual=-10 | 422 | **400** | `'Percentual' must be greater than '0'.` | FAIL |

### Observacao importante

A validacao de negocio esta funcionando corretamente — todos os inputs invalidos sao rejeitados com mensagem adequada. O problema e exclusivamente o HTTP status code retornado: a API retorna 400 (Bad Request) onde o contrato especifica 422 (Unprocessable Entity).

**Status: FAIL** — Status code incorreto em todos os 5 cenarios (400 vs 422 esperado)

---

## DIV-03 — Busca de titular por documento CPF/CNPJ

### Dados utilizados

Titular de referencia: "Gomes Silva Tasso"
- CPF digits: `13505468797`
- CPF formatado: `135.054.687-97`

### Resultados por cenario

| CT | Query | Expected | Actual | Status |
|----|-------|----------|--------|--------|
| CT-01 | `?q=13505468797` (CPF sem formatacao) | >= 1 resultado | 1 resultado — "Gomes Silva Tasso" | PASS |
| CT-02 | `?q=135.054` (parcial com pontuacao) | >= 1 resultado | **0 resultados** | FAIL |
| CT-03 | `?q=Gomes` (busca por nome) | >= 1 resultado | 2 resultados — "Gomes Silva Tasso", "Tasso Silva Gomes" | PASS |

### Detalhe CT-01 (PASS)

```json
[
  {
    "id": "de9f6d12-a4c8-4489-800f-cfa330afac6f",
    "codigo": 3,
    "nome": "Gomes Silva Tasso",
    "tipo": "PF",
    "documentoFormatado": "135.054.687-97",
    "associacaoSigla": "SOCINPRO"
  }
]
```

### Detalhe CT-02 (FAIL)

- Input: `GET /titulares/busca?q=135.054`
- Response: HTTP 200, body: `[]`
- Expected: ao menos 1 resultado (o CPF `135.054.687-97` contem a substring `135.054`)
- Actual: array vazio — a busca nao considera substrings com pontuacao do documento formatado

### Detalhe CT-03 (PASS)

```json
[
  { "nome": "Gomes Silva Tasso", "tipo": "PF", "documentoFormatado": "135.054.687-97" },
  { "nome": "Tasso Silva Gomes", "tipo": "PF", "documentoFormatado": "120.249.067-02" }
]
```

**Status: PARCIAL — 2 PASS / 1 FAIL**

---

## Resumo Final

| Item | Cenarios | PASS | FAIL | Status Geral |
|------|----------|------|------|--------------|
| FAIL-01 (RF-23 depuracao) | 5 passos | 4 passos ok | Falha no passo 5 (POST /depurar HTTP 500) | FAIL |
| DIV-02 (HTTP 422 percentual) | 5 | 0 | 5 | FAIL |
| DIV-03 (busca por documento) | 3 | 2 | 1 | PARCIAL |

### Falhas identificadas (nova rodada v3)

1. **FAIL-01 PERSISTE:** POST /obras/{id}/depurar retorna HTTP 500 com NullReferenceException em `DepurarObraCommand.cs:32`. A copia de titularidades na depuracao nao pode ser testada pois o endpoint crasha antes.

2. **DIV-02 PERSISTE:** Validacao de percentual invalido retorna HTTP 400 em vez de 422 em todos os 5 cenarios (POST percentual=0, POST percentual negativo, POST percentual>100, PUT percentual=0, PUT percentual negativo).

3. **DIV-03 PARCIALMENTE PERSISTE:** Busca por CPF completo sem formatacao funciona (PASS). Busca por nome funciona (PASS). Busca por substring com pontuacao (`135.054`) retorna array vazio (FAIL) — a API nao faz match contra o documento formatado.

---

## Evidencias

```
tasks/cadastro/prd-titularidades-autorais/qa-evidence/
├── retest_v3_requests.log   — todas as requests/responses desta execucao
└── qa_retest_report_v3.md   — este relatorio
```
