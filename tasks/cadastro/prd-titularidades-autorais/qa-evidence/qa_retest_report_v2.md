# QA Report — Retest F04 Titularidades Autorais (v2)

**Data/Hora:** 2026-04-10T15:22:00Z
**Status Geral:** FAIL
**Ambiente:** http://localhost:5001/api/v1
**Tipos de teste:** API + Banco

---

## Resumo dos Retestes

| ID | Cenario | Tipo | Status |
|----|---------|------|--------|
| FAIL-01 | RF-23: Titularidades copiadas na depuracao | API + Banco | FAIL |
| DIV-02/CT-01 | POST percentual = 0 retorna 422 | API | FAIL |
| DIV-02/CT-02 | POST percentual negativo (-5) retorna 422 | API | FAIL |
| DIV-02/CT-03 | POST percentual > 100 (150) retorna 422 | API | FAIL |
| DIV-02/CT-04 | PUT percentual = 0 retorna 422 | API | FAIL |
| DIV-02/CT-05 | PUT percentual negativo (-3) retorna 422 | API | FAIL |
| DIV-03/CT-01 | Busca por CPF sem formatacao (13505468797) | API | PASS |
| DIV-03/CT-02 | Busca por CPF com pontuacao parcial (135.054) | API | FAIL |
| DIV-03/CT-03 | Busca por nome (Gomes Silva) — regressao | API | PASS |

---

## Detalhes por Cenario

---

### FAIL-01 — RF-23: Titularidades copiadas na depuracao — FAIL

**Pre-condicao:** obra LIBERADA com 2 titularidades (AUTOR 60% + EDITOR 40%)

**Passos executados:**

1. Criada obra PENDENTE (id: `5d07ae77-eead-4685-8f3e-a3e1fb038cee`, codigo 38)
   - `POST /obras` com `{"titulo": "QA Retest Depuracao RF23", "tipo": "MUSICAL", "genero": "MPB"}`
   - Status: 201
2. Adicionada titularidade AUTOR 60% (titular PF: Tasso Silva Gomes)
   - `POST /obras/5d07ae77.../titularidades` — Status: 201
3. Adicionada titularidade EDITOR 40% (titular PJ: Editora de Teste)
   - `POST /obras/5d07ae77.../titularidades` — Status: 201, somaPercentual: 100
4. Status alterado para LIBERADO diretamente no banco:
   - `UPDATE cadastro.obras_musicais SET "Status" = 'LIBERADO' WHERE "Id" = '5d07ae77...'`
   - Retornou: `5d07ae77-eead-4685-8f3e-a3e1fb038cee|LIBERADO` (UPDATE 1)
5. `POST /obras/5d07ae77.../depurar` com body `{"titulo": "QA Retest Depuracao RF23 - DEPURADA", "tipo": "MUSICAL", "genero": "MPB"}`
   - Status: 201
   - Obra original passou para status DEPURADA
   - Nova obra criada: id `0c800ab4-d87b-4301-83f3-95180f52a604` (codigo 39), status PENDENTE

6. **CRITICO — FALHOU AQUI:**
   - `GET /obras/0c800ab4.../titularidades`
   - Status: 200
   - **Expected:** array com 2 titularidades copiadas (AUTOR 60%, EDITOR 40%)
   - **Actual:** `{ "obraId": "0c800ab4...", "titularidades": [], "somaPercentual": 0, "somaCompleta": false }`

7. Validacao no banco confirmou a falha:

```
-- Obra original (5d07ae77): 2 registros
66784160-...|48882c43-...|AUTOR|60.0000
c80f35e1-...|86ac9aba-...|EDITOR|40.0000

-- Nova obra (0c800ab4): 0 registros
(vazio)
```

**Expected:** `cadastro.titularidades_autorais WHERE "ObraId" = '0c800ab4...'` retorna 2 linhas
**Actual:** 0 linhas retornadas

**Evidencias:** `retest_v2_requests.log` secao FAIL-01

---

### DIV-02 — HTTP 422 para validacao de percentual — FAIL (todos os 5 sub-cenarios)

**Obra usada:** `f90227e2-bff5-4085-9bfe-797770c029a7` (PENDENTE, sem titularidades no inicio)

**Observacao importante:** a API valida corretamente o percentual e retorna erro descritivo, porem o status HTTP retornado e 400 (Bad Request) em vez de 422 (Unprocessable Entity) em todos os casos.

#### CT-01 — POST percentual = 0

**Input:** `POST /obras/.../titularidades` com `{"titularId": "...", "papel": "Autor", "categoria": "AUTOR", "percentual": 0}`
**Expected:** HTTP 422
**Actual:** HTTP 400

```json
{
  "title": "Validation Error",
  "status": 400,
  "detail": "'Percentual' must be greater than '0'.",
  "errors": { "Percentual": ["'Percentual' must be greater than '0'."] }
}
```

#### CT-02 — POST percentual negativo (-5)

**Input:** mesmo payload com `"percentual": -5`
**Expected:** HTTP 422
**Actual:** HTTP 400

```json
{
  "title": "Validation Error",
  "status": 400,
  "errors": { "Percentual": ["'Percentual' must be greater than '0'."] }
}
```

#### CT-03 — POST percentual > 100 (150)

**Input:** mesmo payload com `"percentual": 150`
**Expected:** HTTP 422
**Actual:** HTTP 400

```json
{
  "title": "Validation Error",
  "status": 400,
  "errors": { "Percentual": ["'Percentual' must be less than or equal to '100'."] }
}
```

#### CT-04 — PUT percentual = 0

**Input:** `PUT /obras/.../titularidades/102989e7-...` com `{"percentual": 0}`
**Expected:** HTTP 422
**Actual:** HTTP 400

```json
{
  "title": "Validation Error",
  "status": 400,
  "errors": { "Percentual": ["'Percentual' must be greater than '0'."] }
}
```

#### CT-05 — PUT percentual negativo (-3)

**Input:** `PUT /obras/.../titularidades/102989e7-...` com `{"percentual": -3}`
**Expected:** HTTP 422
**Actual:** HTTP 400

```json
{
  "title": "Validation Error",
  "status": 400,
  "errors": { "Percentual": ["'Percentual' must be greater than '0'."] }
}
```

**Observacao de setup:** uma titularidade valida (AUTOR, 50%) foi criada com sucesso (status 201) usando o mesmo endpoint, confirmando que o endpoint funciona. O problema e exclusivamente o status code retornado nas validacoes.

**Evidencias:** `retest_v2_requests.log` secao DIV-02

---

### DIV-03 — Busca de titular por documento (CPF/CNPJ) — FAIL PARCIAL

#### CT-01 — Busca por CPF sem formatacao (13505468797) — PASS

**Input:** `GET /titulares/busca?q=13505468797`
**Expected:** HTTP 200 com resultados contendo titular com CPF 135.054.687-97
**Actual:** HTTP 200, 1 resultado retornado

```json
[{
  "id": "de9f6d12-a4c8-4489-800f-cfa330afac6f",
  "nome": "Gomes Silva Tasso",
  "tipo": "PF",
  "documentoFormatado": "135.054.687-97"
}]
```

**Resultado:** PASS

#### CT-02 — Busca por CPF com pontuacao parcial (135.054) — FAIL

**Input:** `GET /titulares/busca?q=135.054`
**Expected:** HTTP 200 com resultados (o titular com CPF 135.054.687-97 deve aparecer)
**Actual:** HTTP 200, array vazio `[]`

**Expected:** ao menos 1 resultado (titular Gomes Silva Tasso, CPF 135.054.687-97)
**Actual:** 0 resultados

**Evidencias:** `retest_v2_requests.log` secao DIV-03

#### CT-03 — Busca por nome (Gomes Silva) — PASS (regressao OK)

**Input:** `GET /titulares/busca?q=Gomes+Silva`
**Expected:** HTTP 200 com resultados
**Actual:** HTTP 200, 1 resultado (Gomes Silva Tasso)

**Resultado:** PASS

---

## Observacao sobre estrutura de resposta

O endpoint `GET /titulares/busca` retorna um **array JSON direto** (sem envelope `data`/`pagination`), diferente de outros endpoints da API que usam envelope paginado. Isso e uma inconsistencia de contrato, mas nao e escopo deste retest.

---

## Resumo de Status

**FAIL-01 (RF-23 depuracao):** FAIL confirmado. Titularidades NAO sao copiadas para a nova obra gerada pela depuracao. Validado via API (titularidades: []) e banco (0 registros em `cadastro.titularidades_autorais` para a nova obraId).

**DIV-02 (HTTP 422 percentual):** FAIL em todos os 5 sub-cenarios. A validacao de negocio funciona corretamente (rejeita percentuais invalidos com mensagem descritiva), mas o status HTTP e 400 em vez de 422. Nenhuma das correcoes alterou o status code.

**DIV-03 (busca por documento):** FAIL PARCIAL.
- Busca por CPF completo sem formatacao: PASS
- Busca por CPF com pontuacao parcial (`135.054`): FAIL — retorna array vazio
- Busca por nome: PASS (regressao OK)

---

## Evidencias

```
tasks/cadastro/prd-titularidades-autorais/qa-evidence/
├── retest_v2_requests.log   (log completo de todas as requisicoes e respostas)
└── qa_retest_report_v2.md   (este arquivo)
```

---

## Status para o Orquestrador

**Status:** FAIL
**Itens que continuam falhando (3 de 3):**
1. FAIL-01: RF-23 titularidades NAO copiadas na depuracao (bug nao corrigido)
2. DIV-02: status HTTP 400 em vez de 422 para validacao de percentual (bug nao corrigido)
3. DIV-03/CT-02: busca por CPF com pontuacao parcial retorna vazio (bug nao corrigido)

**Itens que passaram parcialmente:**
- DIV-03/CT-01 (busca por CPF sem formatacao): PASS
- DIV-03/CT-03 (busca por nome): PASS (regressao mantida)
