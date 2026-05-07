# QA Report — Reteste V4 — F04 Titularidades Autorais

**Data/Hora:** 2026-04-10T19:00:00Z
**Versao reteste:** v4
**Status Geral:** PASS

---

## Contexto

- **Feature:** F04 Titularidades Autorais
- **API:** http://localhost:5001/api/v1
- **Itens retestados:** 3 (FAIL-01, DIV-02, DIV-03)
- **Autenticacao:** Bearer token (Keycloak analista.teste)
- **Log de evidencias:** `retest_v4_requests.log`

---

## Resumo dos Casos

| ID | Cenario | Tipo | Status |
|----|---------|------|--------|
| FAIL-01 CT-01 | Criar obra PENDENTE (POST /obras) | API | PASS |
| FAIL-01 CT-02 | Listar titulares (GET /titulares) | API | PASS |
| FAIL-01 CT-03 | Adicionar titularidade PF AUTOR 60% | API | PASS |
| FAIL-01 CT-03b | Adicionar titularidade PJ EDITOR 40% | API | PASS |
| FAIL-01 CT-04 | Confirmar soma 100% (GET titularidades) | API | PASS |
| FAIL-01 CT-05 | UPDATE banco Status=LIBERADO | Banco | PASS |
| FAIL-01 CT-06 | POST /obras/{id}/depurar — HTTP 201 | API | PASS |
| FAIL-01 CT-07 | GET nova obra titularidades — 2 copiadas | API | PASS |
| FAIL-01 CT-08 | Banco: 2 linhas titularidades na nova obra | Banco | PASS |
| DIV-02 CT-01 | POST percentual=0 → 422 | API | PASS |
| DIV-02 CT-02 | POST percentual=-5 → 422 | API | PASS |
| DIV-02 CT-03 | POST percentual=150 → 422 | API | PASS |
| DIV-02 CT-04 | PUT percentual=0 → 422 | API | PASS |
| DIV-02 CT-05 | PUT percentual=-10 → 422 | API | PASS |
| DIV-03 CT-01 | GET /busca?q=13505468797 (sem pontuacao) | API | PASS |
| DIV-03 CT-02 | GET /busca?q=135.054 (com pontuacao) | API | PASS |
| DIV-03 CT-03 | GET /busca?q=Tasso (por nome) | API | PASS |

---

## Detalhes por Cenario

### FAIL-01 — RF-23: Titularidades copiadas na depuracao PASS

**Pre-condicao:** API respondendo (GET /obras → 200), token valido.

#### CT-01: Criar obra PENDENTE
- Entrada: `POST /obras` com `{titulo, tipo:MUSICAL, generoMusical:null, duracaoSegundos:200}`
- Expected: HTTP 201 com ID da obra
- Actual: HTTP 201 — `id: 5e4fea31-7a35-441a-a58a-dc07388ca0b6`
- Nota tecnica: o campo obrigatorio e `tipo` (valores: MUSICAL, LITEROMUSICAL, VERSAO, POT_POURRI), nao `generoMusical`

#### CT-02: Listar titulares
- Entrada: `GET /titulares?pageSize=50`
- Expected: pelo menos 1 PF e 1 PJ
- Actual: HTTP 200, 10 titulares no total
- Titular PF selecionado: `48882c43` (Tasso Silva Gomes, ATIVO)
- Titular PJ selecionado: `86ac9aba` (Editora de Teste, ATIVO)
- Nota tecnica: resposta usa `.data[]` com campo `.tipo` (nao `.tipoPessoa`)

#### CT-03 + CT-03b: Adicionar 2 titularidades
- Entrada POST 1: `{titularId:48882c43, categoria:AUTOR, percentual:60}`
- Entrada POST 2: `{titularId:86ac9aba, categoria:EDITOR, percentual:40}`
- Expected: HTTP 201 para ambas
- Actual: HTTP 201 para ambas
- Nota tecnica: campo correto e `categoria` (nao `papel`)

#### CT-04: Confirmar soma 100%
- Entrada: `GET /obras/5e4fea31/titularidades`
- Expected: `somaPercentual=100, somaCompleta=true, 2 titularidades`
- Actual: `somaPercentual: 100.0000, somaCompleta: true, titularidades: [2 itens]`

#### CT-05: Tornar LIBERADA
- Comando: `UPDATE cadastro.obras_musicais SET "Status" = 'LIBERADO' WHERE "Id" = '5e4fea31...'`
- Expected: UPDATE 1 row
- Actual: atualizado; confirmado via `GET /obras/5e4fea31` → `status: LIBERADO`

#### CT-06: POST /depurar
- Entrada: `POST /obras/5e4fea31/depurar` com body `{titulo:"...Depurada", tipo:"MUSICAL", subtitulo:null, genero:null}`
- Expected: HTTP 201
- Actual: HTTP 201
- Nova obra ID: `070c562a-cf6e-46c5-88c3-6719cbdc72cd` (status PENDENTE)
- Nota tecnica: o endpoint exige body `{titulo, tipo, subtitulo?, genero?}` — sem body ou com `{}` retorna 500

#### CT-07 — CRITICO: GET titularidades da nova obra
- Entrada: `GET /obras/070c562a/titularidades`
- Expected: 2 titularidades copiadas (AUTOR 60% + EDITOR 40%), somaPercentual=100
- Actual:
  ```json
  {
    "obraId": "070c562a-cf6e-46c5-88c3-6719cbdc72cd",
    "titularidades": [
      {"categoria":"EDITOR","percentual":40.0000,"titular":{"nome":"Editora de Teste"}},
      {"categoria":"AUTOR","percentual":60.0000,"titular":{"nome":"Tasso Silva Gomes"}}
    ],
    "somaPercentual": 100.0000,
    "somaCompleta": true
  }
  ```
- **Resultado: PASS — titularidades copiadas com sucesso**

#### CT-08: Validacao banco
- Query: `SELECT * FROM cadastro.titularidades_autorais WHERE "ObraId" = '070c562a...'`
- Expected: 2 linhas com AUTOR/60% e EDITOR/40%
- Actual:
  ```
  Id                                   | TitularId | Categoria | Percentual
  1e7f7f56-d377-445c-8f9f-e2ff0f07f5ef | 48882c43  | AUTOR     | 60.0000
  76eda338-c7d3-4b46-a836-6dc4506bc918 | 86ac9aba  | EDITOR    | 40.0000
  (2 rows)
  ```
- **Resultado: PASS — 2 registros no banco**

---

### DIV-02 — HTTP 422 para percentual invalido PASS

Obra usada: `070c562a` (PENDENTE). Titular extra disponivel: `de9f6d12` (Gomes Silva Tasso).

| Caso | Entrada | Expected | Actual | Mensagem de erro |
|------|---------|----------|--------|-----------------|
| CT-01 | POST percentual=0 | 422 | 422 | Percentual deve estar entre 0.0001 e 100.0000 |
| CT-02 | POST percentual=-5 | 422 | 422 | Percentual deve estar entre 0.0001 e 100.0000 |
| CT-03 | POST percentual=150 | 422 | 422 | Percentual deve estar entre 0.0001 e 100.0000 |
| CT-04 | PUT percentual=0 | 422 | 422 | Percentual deve estar entre 0.0001 e 100.0000 |
| CT-05 | PUT percentual=-10 | 422 | 422 | Percentual deve estar entre 0.0001 e 100.0000 |

Todos os 5 sub-casos retornaram HTTP 422 com mensagem de validacao precisa.

---

### DIV-03 — Busca de titular por documento com pontuacao PASS

Endpoint: `GET /api/v1/titulares/busca?q={termo}`
Estrutura de resposta: array direto (nao paginado).

Documentos usados para teste:
- CPF sem formatacao: `13505468797` (Gomes Silva Tasso, documentoFormatado: 135.054.687-97)
- CPF com pontuacao parcial: `135.054`
- Nome: `Tasso`

| Caso | Query string | Expected | Actual |
|------|-------------|----------|--------|
| CT-01 | `?q=13505468797` | HTTP 200, >= 1 resultado | HTTP 200, 1 resultado (Gomes Silva Tasso) |
| CT-02 | `?q=135.054` | HTTP 200, >= 1 resultado | HTTP 200, 1 resultado (Gomes Silva Tasso) |
| CT-03 | `?q=Tasso` | HTTP 200, >= 1 resultado | HTTP 200, 2 resultados (Gomes Silva Tasso + Tasso Silva Gomes) |

Busca por pontuacao (`135.054`) retornou o mesmo resultado que busca por digitos (`13505468797`),
confirmando que o normalizador de documento esta operacional.
Busca por nome nao regrediu.

---

## Observacoes Tecnicas

1. Endpoint `POST /obras` — campo `tipo` e obrigatorio (MUSICAL, LITEROMUSICAL, VERSAO, POT_POURRI).
   O `generoMusical` e opcional.
2. Endpoint `POST /obras/{id}/depurar` — exige body `{titulo, tipo, subtitulo?, genero?}`.
   Sem body retorna HTTP 500 com "Required parameter not provided from body".
3. Endpoint `GET /titulares` — resposta usa `.data[]` com campo `.tipo` (PF/PJ), nao `.tipoPessoa`.
4. Endpoint `GET /titulares/busca` — retorna array direto, nao objeto paginado.

---

## Evidencias

```
/qa-evidence/
├── retest_v4_requests.log   (log completo de todas as requests/responses)
└── qa_retest_report_v4.md   (este arquivo)
```

---

## Status para o Orquestrador

**Status:** PASS
**Todos os 3 itens retestados: PASS**
- FAIL-01 (RF-23 copia titularidades na depuracao): PASS
- DIV-02 (HTTP 422 percentual invalido POST e PUT): PASS
- DIV-03 (busca por documento com pontuacao): PASS
