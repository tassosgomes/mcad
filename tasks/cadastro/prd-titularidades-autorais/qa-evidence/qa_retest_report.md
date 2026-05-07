# QA Retest Report — F04 Titularidades Autorais

**Data/Hora:** 2026-04-10T15:15:00Z
**Status Geral:** FAIL
**Ambiente:** http://localhost:5001/api/v1
**Banco:** db.tasso.dev.br:5432/mcad (schema: cadastro)

---

## Resumo Executivo

| Item | Descricao | Status |
|------|-----------|--------|
| FAIL-01 | RF-23: Titularidades copiadas na depuracao | FAIL |
| DIV-02 | HTTP 422 para percentual invalido (POST e PUT) | FAIL |
| DIV-03 | Busca de titular por documento (CPF/CNPJ) | FAIL PARCIAL |

---

## FAIL-01 — RF-23: Titularidades devem ser copiadas na depuracao

### Cenario executado

**Pre-condicao:**
- Obra criada: `53dc1620-bd50-48a6-a130-808d278af56e` (Obra Reteste RF23 Titularidades, status PENDENTE)
- Titularidades adicionadas:
  - Gomes Silva Tasso (PF) — AUTOR — 60%
  - Editora de Teste (PJ) — EDITOR — 40%
  - Soma: 100% (somaCompleta: true)
- Status alterado para LIBERADO via banco: `UPDATE cadastro.obras_musicais SET "Status" = 'LIBERADO' WHERE "Id" = '53dc1620...'`

**Passo de depuracao:**

```
POST /api/v1/obras/53dc1620-bd50-48a6-a130-808d278af56e/depurar
Body: {"titulo": "Obra Reteste RF23 Titularidades (Versao Nova)", "tipo": "MUSICAL", "genero": "MPB"}
```

**Resposta HTTP 201:**
```json
{
  "obraDepurada": {
    "id": "53dc1620-bd50-48a6-a130-808d278af56e",
    "status": "DEPURADA",
    "obraDepuradaParaId": "5c5dea1b-f540-4450-b82b-378d9234f26a"
  },
  "novaObra": {
    "id": "5c5dea1b-f540-4450-b82b-378d9234f26a",
    "status": "PENDENTE",
    "iswc": null
  }
}
```

### Verificacao das titularidades

**GET /obras/53dc1620.../titularidades (obra original — esperado: preservadas)**
```
Status: 200
somaPercentual: 100.0
titularidades: 2 registros (AUTOR 60%, EDITOR 40%)
```
Resultado: PRESERVADAS (correto)

**GET /obras/5c5dea1b.../titularidades (nova obra — esperado: 2 titularidades copiadas)**
```
Status: 200
somaPercentual: 0
titularidades: [] (lista vazia)
```
Resultado: FAIL — nenhuma titularidade foi copiada

**Validacao no banco:**
```sql
SELECT "Id", "ObraId", "TitularId", "Categoria", "Percentual"
FROM cadastro.titularidades_autorais
WHERE "ObraId" IN ('53dc1620-bd50-48a6-a130-808d278af56e', '5c5dea1b-f540-4450-b82b-378d9234f26a');
```
```
-- 2 registros apenas para 53dc1620 (obra original)
-- 0 registros para 5c5dea1b (nova obra)
```

### Resultado: FAIL

**Expected:** Nova obra `5c5dea1b` com 2 titularidades copiadas (AUTOR 60%, EDITOR 40%), somaPercentual=100  
**Actual:** Nova obra `5c5dea1b` com 0 titularidades, somaPercentual=0  
**Evidencia banco:** Tabela `cadastro.titularidades_autorais` nao contem nenhum registro com `ObraId = '5c5dea1b-f540-4450-b82b-378d9234f26a'`

---

## DIV-02 — HTTP 400 -> 422 para validacao de percentual

### Contexto

A correcao declarada era que POST e PUT com percentual invalido passariam a retornar 422 (Unprocessable Entity) em vez de 400 (Bad Request). O teste verifica se essa correcao foi aplicada.

### CT-01: POST com percentual 0

```
POST /api/v1/obras/53dc1620-bd50-48a6-a130-808d278af56e/titularidades
Body: {"titularId":"de9f6d12-a4c8-4489-800f-cfa330afac6f","categoria":"AUTOR","percentual":0}
```

**Expected:** 422  
**Actual:** 400  
**Corpo da resposta:**
```json
{
  "title": "Validation Error",
  "status": 400,
  "detail": "'Percentual' must be greater than '0'.",
  "errors": {"Percentual": ["'Percentual' must be greater than '0'."]}
}
```
Resultado: FAIL

### CT-02: POST com percentual negativo (-10)

```
POST /api/v1/obras/53dc1620-bd50-48a6-a130-808d278af56e/titularidades
Body: {"titularId":"de9f6d12...","categoria":"AUTOR","percentual":-10}
```

**Expected:** 422  
**Actual:** 400  
Resultado: FAIL

### CT-03: POST com percentual > 100 (150)

```
POST /api/v1/obras/53dc1620-bd50-48a6-a130-808d278af56e/titularidades
Body: {"titularId":"de9f6d12...","categoria":"AUTOR","percentual":150}
```

**Expected:** 422  
**Actual:** 400  
Resultado: FAIL

### CT-04: PUT com percentual 0

```
PUT /api/v1/obras/53dc1620.../titularidades/6ea3cbd8-5963-4b55-81b0-b120e538127e
Body: {"percentual":0}
```

**Expected:** 422  
**Actual:** 400  
**Corpo da resposta:**
```json
{
  "title": "Validation Error",
  "status": 400,
  "detail": "'Percentual' must be greater than '0'.",
  "errors": {"Percentual": ["'Percentual' must be greater than '0'."]}
}
```
Resultado: FAIL

### CT-05: PUT com percentual negativo (-5)

```
PUT /api/v1/obras/53dc1620.../titularidades/6ea3cbd8...
Body: {"percentual":-5}
```

**Expected:** 422  
**Actual:** 400  
Resultado: FAIL

### Resultado Geral DIV-02: FAIL

**Expected:** HTTP 422 em todos os 5 cenarios  
**Actual:** HTTP 400 em todos os 5 cenarios  
**Observacao:** A validacao funciona corretamente (rejeita percentual invalido e retorna mensagem adequada), mas o codigo HTTP permanece 400 em vez de 422. A correcao do status code nao foi aplicada.

---

## DIV-03 — Busca de titular por documento (CPF/CNPJ)

### CT-01: Busca por fragmento de CPF sem formatacao

```
GET /api/v1/titulares/busca?q=13505
```

**Expected:** Retornar Gomes Silva Tasso (CPF: 13505468797)  
**Actual:** Status 200, 1 resultado correto  
Resultado: PASS

### CT-02: Busca por fragmento de CPF com formatacao

```
GET /api/v1/titulares/busca?q=135.054
```

**Expected:** Retornar Gomes Silva Tasso (CPF formatado: 135.054.687-97)  
**Actual:** Status 200, lista vazia `[]`  
Resultado: FAIL

### CT-03: Busca por fragmento de CNPJ sem formatacao

```
GET /api/v1/titulares/busca?q=11222333
```

**Expected:** Retornar QA Editora Numerica (CNPJ: 11222333000181)  
**Actual:** Status 200, 2 resultados corretos (QA Editora Numerica + QA PF Segundo)  
Resultado: PASS

### CT-04: Busca por nome (regressao)

```
GET /api/v1/titulares/busca?q=Tasso
```

**Expected:** Retornar titulares com "Tasso" no nome  
**Actual:** Status 200, 2 resultados (Gomes Silva Tasso, Tasso Silva Gomes)  
Resultado: PASS

### CT-05: Busca por fragmento de CNPJ com formatacao

```
GET /api/v1/titulares/busca?q=11.222
```

**Expected:** Retornar QA Editora Numerica (CNPJ formatado: 11.222.333/0001-81)  
**Actual:** Status 200, lista vazia `[]`  
Resultado: FAIL

### Resultado Geral DIV-03: FAIL PARCIAL

**Comportamento observado:**
- Busca por fragmento de documento SEM formatacao (ex: `13505`, `11222333`): funciona
- Busca por fragmento de documento COM formatacao/pontuacao (ex: `135.054`, `11.222`): retorna vazio
- Busca por nome: funciona

**Expected:** Busca por qualquer fragmento do documento, com ou sem formatacao, deve retornar resultados  
**Actual:** Apenas fragmentos sem pontuacao funcionam. Qualquer ponto, hifen ou barra no termo de busca resulta em lista vazia.

**Casos que passaram:** CT-01, CT-03, CT-04 (3/5)  
**Casos que falharam:** CT-02, CT-05 (2/5) — especificamente quando o fragmento contem pontuacao de formatacao

---

## Tabela de Resultados

| ID | Descricao | Status | Detalhe |
|----|-----------|--------|---------|
| FAIL-01 | RF-23: Titularidades copiadas na depuracao | FAIL | Nova obra nasce sem titularidades |
| DIV-02 CT-01 | POST percentual 0 retorna 422 | FAIL | Retorna 400 |
| DIV-02 CT-02 | POST percentual negativo retorna 422 | FAIL | Retorna 400 |
| DIV-02 CT-03 | POST percentual > 100 retorna 422 | FAIL | Retorna 400 |
| DIV-02 CT-04 | PUT percentual 0 retorna 422 | FAIL | Retorna 400 |
| DIV-02 CT-05 | PUT percentual negativo retorna 422 | FAIL | Retorna 400 |
| DIV-03 CT-01 | Busca CPF sem formatacao | PASS | Retorna 1 resultado correto |
| DIV-03 CT-02 | Busca CPF com formatacao (ponto) | FAIL | Retorna lista vazia |
| DIV-03 CT-03 | Busca CNPJ sem formatacao | PASS | Retorna resultados corretos |
| DIV-03 CT-04 | Busca por nome (regressao) | PASS | Retorna resultados corretos |
| DIV-03 CT-05 | Busca CNPJ com formatacao (ponto) | FAIL | Retorna lista vazia |

**Resultado:** 3 PASS, 8 FAIL

---

## Status Final para o Orquestrador

**Status:** FAIL  
**Nenhuma das 3 correcoes foi completamente aplicada:**

1. **FAIL-01 (RF-23):** A copia de titularidades na depuracao NAO foi implementada. A nova obra nasce sem titularidades. Confirmado via API e banco de dados.

2. **DIV-02:** A correcao do status HTTP 400 -> 422 NAO foi aplicada. A validacao funciona (rejeita valores invalidos corretamente), mas o codigo de retorno permanece 400 em todos os 5 cenarios testados.

3. **DIV-03:** A correcao foi PARCIAL. Busca por documento sem formatacao funciona. Busca por documento com pontuacao de formatacao (ponto, hifen, barra) retorna lista vazia — o problema nao foi resolvido para fragmentos formatados.
