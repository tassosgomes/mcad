# QA Retest Report v2 — BUG-02-01: Filtro ISRC parcial

**Bug:** BUG-02-01 — Filtro ISRC parcial causa HTTP 500
**Data/Hora:** 2026-04-11T16:46:17Z
**Ambiente:** http://localhost:5001/api/v1
**Autenticacao:** Bearer JWT via Keycloak (mcad-cli, analista.teste)
**Status Geral:** FAIL

---

## Contexto

A primeira rodada de reteste (v1) identificou que a busca por ISRC parcial (entrada com menos de 12 caracteres) causava HTTP 500 com "Invalid cast from 'System.String' to 'Cadastro.Domain.ValueObjects.Isrc'". Uma correcao foi aplicada. Este reteste v2 verifica se a correcao foi eficaz.

---

## Casos de Teste

| CT | Descricao | Entrada | Expected HTTP | Expected Total | Status |
|----|-----------|---------|---------------|----------------|--------|
| CT-1 | ISRC parcial curto (5 chars) | `isrc=BRABC` | 200 | registros com prefixo BRABC | FAIL |
| CT-2 | ISRC parcial (7 chars) | `isrc=BRABC26` | 200 | registros contendo BRABC26 | FAIL |
| CT-3 | ISRC impossivel (nao existe) | `isrc=ZZZZZ` | 200 | 0 resultados | FAIL |
| CT-4 | ISRC exato 12 chars (regressao) | `isrc=BRABC2300001` | 200 | 1 resultado | PASS |
| CT-5 | ISRC formatado com hifens | `isrc=BR-ABC-23-00001` | 200 | 1 resultado (normalizacao de hifens) | PASS |
| CT-6 | Sem filtro ISRC (regressao geral) | (nenhum) | 200 | todos os registros (>= 24) | PASS |

---

## Detalhes por Caso

---

### CT-1 — ISRC parcial 5 chars (BRABC) — FAIL

**URL:** `GET http://localhost:5001/api/v1/fonogramas?page=1&size=50&isrc=BRABC`
**Expected:** HTTP 200 com registros cujo ISRC contenha "BRABC"
**Actual:** HTTP 500

**Erro retornado:**
```json
{
  "title": "Internal Server Error",
  "status": 500,
  "detail": "Invalid cast from 'System.String' to 'Cadastro.Domain.ValueObjects.Isrc'.",
  "instance": "/api/v1/fonogramas"
}
```

**Conclusao:** A correcao aplicada nao resolveu o problema. O mesmo erro da v1 persiste.

---

### CT-2 — ISRC parcial 7 chars (BRABC26) — FAIL

**URL:** `GET http://localhost:5001/api/v1/fonogramas?page=1&size=50&isrc=BRABC26`
**Expected:** HTTP 200 com registros cujo ISRC contenha "BRABC26"
**Actual:** HTTP 500

**Erro retornado:**
```json
{
  "title": "Internal Server Error",
  "status": 500,
  "detail": "Invalid cast from 'System.String' to 'Cadastro.Domain.ValueObjects.Isrc'.",
  "instance": "/api/v1/fonogramas"
}
```

**Conclusao:** Mesmo erro do CT-1. Qualquer entrada com menos de 12 caracteres segue o caminho de busca parcial (ILike), que falha no cast do EF Core.

---

### CT-3 — ISRC impossivel (ZZZZZ) — FAIL

**URL:** `GET http://localhost:5001/api/v1/fonogramas?page=1&size=50&isrc=ZZZZZ`
**Expected:** HTTP 200 com 0 resultados
**Actual:** HTTP 500

**Erro retornado:**
```json
{
  "title": "Internal Server Error",
  "status": 500,
  "detail": "Invalid cast from 'System.String' to 'Cadastro.Domain.ValueObjects.Isrc'.",
  "instance": "/api/v1/fonogramas"
}
```

**Conclusao:** Mesmo erro dos anteriores. A rota parcial e acionada para qualquer valor com menos de 12 chars, independentemente de existir no banco.

---

### CT-4 — ISRC exato 12 chars (BRABC2300001) — PASS

**URL:** `GET http://localhost:5001/api/v1/fonogramas?page=1&size=50&isrc=BRABC2300001`
**Expected:** HTTP 200, total = 1, ISRC = BRABC2300001
**Actual:** HTTP 200, `pagination.total = 1`, ISRC retornado: `BRABC2300001`

Este caminho usa comparacao por igualdade via `Isrc.Create(isrcLimpo)`, que o EF Core traduz corretamente com o converter. Permanece funcionando como na v1.

---

### CT-5 — ISRC formatado com hifens (BR-ABC-23-00001) — PASS

**URL:** `GET http://localhost:5001/api/v1/fonogramas?page=1&size=50&isrc=BR-ABC-23-00001`
**Expected:** HTTP 200, comportamento definido (aceitar ou rejeitar)
**Actual:** HTTP 200, `pagination.total = 1`, ISRC retornado: `BRABC2300001`

A API normaliza hifens antes de processar (BR-ABC-23-00001 vira BRABC2300001, 12 chars), caindo no caminho exato que funciona. Comportamento correto e consistente.

---

### CT-6 — Sem filtro ISRC (regressao geral) — PASS

**URL:** `GET http://localhost:5001/api/v1/fonogramas?page=1&size=50`
**Expected:** HTTP 200, total >= 24
**Actual:** HTTP 200, `pagination.total = 24`

ISRCs presentes (24 registros):
`BRABC2300001, BRABC2600001, BRABC2600002, BRABC2600020, BRABC2600030, BRABC2600031,
BRABC2600050, BRABC2600055, BRABC2600060, BRQA02600001, BRQA02600002, BRQA02600003,
BRQA02600004, BRQA02600005, BRQA02600006, BRQA02600007, BRQA02600008, BRQF02600001,
BRQF02600002, BRQF02600003, BRQF02600004, BRQF02600005, BRQF02600006, BRQF02600007`

---

## Diagnostico da Falha

O erro "Invalid cast from 'System.String' to 'Cadastro.Domain.ValueObjects.Isrc'" ocorre no caminho de busca parcial do repositorio. O campo `Isrc` e mapeado via `HasConversion` no EF Core (ValueObject `Isrc` <-> `VARCHAR`). Quando a query LINQ usa `EF.Property<string>(f, "Isrc")` para construir um `ILike`, o EF Core nao consegue traduzir a expressao para SQL porque o modelo conhece o campo como tipo `Isrc` (nao como `string`), resultando em falha de cast em tempo de execucao.

A correcao aplicada entre a v1 e esta v2 nao alterou o comportamento observavel: o erro e identico, nas mesmas condicoes, com a mesma mensagem.

---

## Resumo

| CT | Entrada | Status HTTP | Total | Resultado |
|----|---------|-------------|-------|-----------|
| CT-1 | `isrc=BRABC` (5 chars) | 500 | — | FAIL |
| CT-2 | `isrc=BRABC26` (7 chars) | 500 | — | FAIL |
| CT-3 | `isrc=ZZZZZ` (impossivel) | 500 | — | FAIL |
| CT-4 | `isrc=BRABC2300001` (12 chars exato) | 200 | 1 | PASS |
| CT-5 | `isrc=BR-ABC-23-00001` (com hifens) | 200 | 1 | PASS |
| CT-6 | (sem filtro) | 200 | 24 | PASS |

**3 FAIL / 3 PASS**

---

## Evidencias

```
/home/tsgomes/mcad/tasks/cadastro/prd-gestao-fonogramas/qa-evidence/
├── requests_retest_v2.log   — log completo com requests, responses e resultados
└── qa_retest_report_v2.md   — este relatorio
```

---

## Status para o Orquestrador

**Status:** FAIL

**Motivo:** BUG-02-01 permanece aberto. A correcao aplicada entre o reteste v1 e este reteste v2 nao teve efeito observavel. Busca por ISRC parcial (qualquer entrada com menos de 12 caracteres ou diferente do formato ISRC completo) continua retornando HTTP 500 com "Invalid cast from 'System.String' to 'Cadastro.Domain.ValueObjects.Isrc'". O requisito RF-08 (filtro por ISRC parcial) continua nao atendido.

**Comportamentos que funcionam corretamente (sem regressao):**
- ISRC exato com 12 chars: PASS (CT-4)
- ISRC com hifens normalizado para 12 chars: PASS (CT-5)
- Listagem sem filtro: PASS (CT-6)
