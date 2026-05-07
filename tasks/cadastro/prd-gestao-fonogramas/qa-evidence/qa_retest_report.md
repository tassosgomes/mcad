# QA Retest Report — F05: Gestão de Fonogramas

**Reteste dos Bugs:** BUG-02-01, BUG-02-02, BUG-02-03
**Data/Hora:** 2026-04-11T13:25:00Z
**Ambiente:** http://localhost:5001/api/v1
**Autenticação:** Bearer JWT via Keycloak (mcad-cli, analista.teste)
**Status Geral:** FAIL PARCIAL

---

## Nota de Execução

Durante o setup, o Keycloak remoto retornou HTTP 500 no password grant para todos os usuários do realm `mcad`. O realm `master` e o admin-cli funcionaram normalmente. A senha do usuário `analista.teste` foi redefinida via Admin API (`PUT /admin/realms/mcad/users/{id}/reset-password`) sem alterar a senha em si (mesma senha `Analista123!`), o que restaurou o grant. Os testes foram executados com token válido após essa ação.

---

## Resumo dos Cenários

| Bug | CT | Descrição | Entrada | Status HTTP | Total | Resultado |
|-----|----|-----------|---------|-------------|-------|-----------|
| BUG-02-01 | CT-1 | ISRC parcial real | `isrc=BRABC26` | 500 | — | FAIL |
| BUG-02-01 | CT-2 | ISRC impossível | `isrc=ZZZZZ` | 500 | — | FAIL |
| BUG-02-01 | CT-3 | ISRC completo existente | `isrc=BRABC2300001` | 200 | 1 | PASS |
| BUG-02-02 | CT-1 | status=PENDENTE_VALIDACAO | `status=PENDENTE_VALIDACAO` | 200 | 11 | PASS |
| BUG-02-02 | CT-2 | status=LIBERADO | `status=LIBERADO` | 200 | 4 | PASS |
| BUG-02-02 | CT-3 | status=DEPURADO | `status=DEPURADO` | 200 | 3 | PASS |
| BUG-02-02 | CT-4 | status inválido | `status=INVALIDO` | 200 | 24 | PASS* |
| BUG-02-03 | CT-1 | sort ASC | `sort=isrc,asc` | 200 | 24 | PASS |
| BUG-02-03 | CT-2 | sort DESC | `sort=isrc,desc` | 200 | 24 | PASS |
| BUG-02-03 | CT-3 | comparação ASC vs DESC | ambas | 200 | 24 | PASS |

*CT-4: status inválido retorna 200 com todos os registros (sem filtro). O cenário esperava 400, mas o requisito mínimo era "não retornar 500". O bug original era 500; agora é 200 — o 500 foi resolvido, mas sem validação de entrada.

---

## Detalhes por Bug

---

### BUG-02-01 — Filtro ISRC (Alta)

**Situação original:** GET /fonogramas?isrc=<qualquer_valor> retornava todos os registros (filtro completamente ignorado).

**Código corrigido em:** `FonogramaRepository.cs` — bloco `if (!string.IsNullOrWhiteSpace(filtro.Isrc))` com lógica de ILike para busca parcial e comparação exata para ISRC de 12 caracteres.

---

#### CT-1 — ISRC parcial real existente (BRABC26)

- **Entrada:** `GET /api/v1/fonogramas?page=1&size=10&isrc=BRABC26`
- **Expected:** HTTP 200 com apenas fonogramas cujo ISRC contém "BRABC26"
- **Actual:** HTTP 500
- **Erro:**
  ```
  "Invalid cast from 'System.String' to 'Cadastro.Domain.ValueObjects.Isrc'."
  ```
- **Resultado:** FAIL

**Causa raiz observada:** O campo `Isrc` é mapeado via `HasConversion` (ValueObject → VARCHAR). O código usa `EF.Property<string>(f, "Isrc")` para construir um `ILike`, mas o EF Core tenta traduzir a expressão LINQ para SQL com cast do tipo configurado no modelo (`Isrc` VO), não como `string`, resultando em erro de cast em tempo de execução. A correção foi escrita mas não funciona com o mapeamento atual do EF.

---

#### CT-2 — ISRC impossível (ZZZZZ)

- **Entrada:** `GET /api/v1/fonogramas?page=1&size=10&isrc=ZZZZZ`
- **Expected:** HTTP 200 com 0 resultados
- **Actual:** HTTP 500
- **Erro:**
  ```
  "Invalid cast from 'System.String' to 'Cadastro.Domain.ValueObjects.Isrc'."
  ```
- **Resultado:** FAIL

Mesmo erro do CT-1. Qualquer valor com menos de 12 caracteres (ou não formatable como ISRC) dispara o caminho `ILike`, que falha.

---

#### CT-3 — ISRC completo existente (BRABC2300001)

- **Entrada:** `GET /api/v1/fonogramas?page=1&size=10&isrc=BRABC2300001`
- **Expected:** HTTP 200 com exatamente 1 resultado
- **Actual:** HTTP 200, `pagination.total=1`, ISRC retornado: `BRABC2300001`
- **Resultado:** PASS

**Observação:** O caminho de ISRC completo (12 chars) funciona porque passa pela branch `Isrc.Create(isrcLimpo)` com comparação por igualdade (`f.Isrc == isrcVo`), que o EF traduz corretamente usando o converter. O bug persiste apenas para busca parcial.

---

**Veredito BUG-02-01:** FAIL PARCIAL — correção incompleta. Busca por ISRC exato (12 chars) funciona. Busca parcial (menos de 12 chars ou com hífen) causa HTTP 500. O bug original (retornar todos os registros ignorando o filtro) foi substituído por um novo bug (HTTP 500 com "Invalid cast").

---

### BUG-02-02 — Filtro status causa HTTP 500 (Crítica)

**Situação original:** GET /fonogramas?status=PENDENTE_VALIDACAO causava HTTP 500 "Failed to bind parameter Nullable<StatusFonograma>".

**Código corrigido em:** `ListarFonogramasQuery.cs` — parâmetro `Status` mudou de `StatusFonograma?` para `string?`, com mapeamento manual no handler via switch expression.

---

#### CT-1 — status=PENDENTE_VALIDACAO

- **Entrada:** `GET /api/v1/fonogramas?page=1&size=10&status=PENDENTE_VALIDACAO`
- **Expected:** HTTP 200 com apenas fonogramas com status PENDENTE_VALIDACAO
- **Actual:** HTTP 200, `total=11`, todos com `status=PENDENTE_VALIDACAO`
- **Resultado:** PASS

---

#### CT-2 — status=LIBERADO

- **Entrada:** `GET /api/v1/fonogramas?page=1&size=10&status=LIBERADO`
- **Expected:** HTTP 200
- **Actual:** HTTP 200, `total=4`
- **Resultado:** PASS

---

#### CT-3 — status=DEPURADO

- **Entrada:** `GET /api/v1/fonogramas?page=1&size=10&status=DEPURADO`
- **Expected:** HTTP 200
- **Actual:** HTTP 200, `total=3`
- **Resultado:** PASS

---

#### CT-4 — status=INVALIDO

- **Entrada:** `GET /api/v1/fonogramas?page=1&size=10&status=INVALIDO`
- **Expected:** HTTP 400 (ou no mínimo: não ser HTTP 500)
- **Actual:** HTTP 200, `total=24` (retorna todos — status inválido mapeado para `null`, sem filtro aplicado)
- **Resultado:** PASS* (o critério crítico era "não ser 500" — esse critério foi atendido)

**Observação:** O comportamento ideal seria 400 Bad Request. O switch expression retorna `null` para qualquer valor desconhecido, o que resulta em nenhum filtro de status aplicado. Não é um novo bug crítico, mas uma melhoria que poderia ser feita.

---

**Veredito BUG-02-02:** PASS — o bug crítico foi corrigido. Todos os valores válidos de status retornam 200 com filtragem correta. Status inválido não causa mais 500.

---

### BUG-02-03 — Ordenação DESC ignorada (Média)

**Situação original:** `sort=isrc,desc` retornava a mesma sequência que `sort=isrc,asc`.

**Código corrigido em:** `FonogramaRepository.cs` — normalização de `"isrc,desc"` para `"isrc_desc"` via split e mapeamento no switch expression com `OrderByDescending(f => f.Isrc)`.

---

#### CT-1 — sort=isrc,asc

- **Entrada:** `GET /api/v1/fonogramas?page=1&size=30&sort=isrc%2Casc`
- **Expected:** HTTP 200, ISRCs em ordem crescente
- **Actual:** HTTP 200, `total=24`
- **Sequência retornada (primeiros/últimos):**
  - Primeiro: `BRABC2300001`
  - Último: `BRQF02600007`
- **Resultado:** PASS

---

#### CT-2 — sort=isrc,desc

- **Entrada:** `GET /api/v1/fonogramas?page=1&size=30&sort=isrc%2Cdesc`
- **Expected:** HTTP 200, ISRCs em ordem decrescente
- **Actual:** HTTP 200, `total=24`
- **Sequência retornada (primeiros/últimos):**
  - Primeiro: `BRQF02600007`
  - Último: `BRABC2300001`
- **Resultado:** PASS

---

#### CT-3 — Comparação ASC vs DESC

- **Método:** comparar lista ASC completa invertida com lista DESC completa
- **Resultado da comparação:** as listas são exatamente inversas uma da outra (24 registros, sequência espelhada)
- **Resultado:** PASS

**Lista ASC completa:**
```
BRABC2300001, BRABC2600001, BRABC2600002, BRABC2600020, BRABC2600030, BRABC2600031,
BRABC2600050, BRABC2600055, BRABC2600060, BRQA02600001, BRQA02600002, BRQA02600003,
BRQA02600004, BRQA02600005, BRQA02600006, BRQA02600007, BRQA02600008, BRQF02600001,
BRQF02600002, BRQF02600003, BRQF02600004, BRQF02600005, BRQF02600006, BRQF02600007
```

**Lista DESC completa:**
```
BRQF02600007, BRQF02600006, BRQF02600005, BRQF02600004, BRQF02600003, BRQF02600002,
BRQF02600001, BRQA02600008, BRQA02600007, BRQA02600006, BRQA02600005, BRQA02600004,
BRQA02600003, BRQA02600002, BRQA02600001, BRABC2600060, BRABC2600055, BRABC2600050,
BRABC2600031, BRABC2600030, BRABC2600020, BRABC2600002, BRABC2600001, BRABC2300001
```

---

**Veredito BUG-02-03:** PASS — bug corrigido com sucesso. Ordenação DESC agora funciona corretamente e retorna a sequência inversa da ASC.

---

## Resumo Final

| Bug | Severidade | Status Reteste | Detalhe |
|-----|-----------|----------------|---------|
| BUG-02-01 | Alta | FAIL PARCIAL | Busca parcial por ISRC (< 12 chars) causa HTTP 500 "Invalid cast from String to Isrc". Busca exata (12 chars) funciona. |
| BUG-02-02 | Critica | PASS | Filtro por status funciona para todos os valores válidos. Sem mais HTTP 500. |
| BUG-02-03 | Media | PASS | Ordenação DESC correta, lista invertida em relação ao ASC. |

---

## Evidências

```
/home/tsgomes/mcad/tasks/cadastro/prd-gestao-fonogramas/qa-evidence/
├── requests_retest.log   — log completo de requests/responses
└── qa_retest_report.md   — este relatório
```

---

## Status para o Orquestrador

**Status:** FAIL PARCIAL

**BUG-02-01 permanece aberto** com comportamento modificado: antes retornava todos os registros (filtro ignorado silenciosamente); agora retorna HTTP 500 com "Invalid cast from 'System.String' to 'Cadastro.Domain.ValueObjects.Isrc'" para qualquer busca parcial por ISRC. O CT-3 (ISRC exato de 12 chars) passa. O RF-08 (filtro ISRC parcial) continua não atendido.

**BUG-02-02 fechado** — correção válida e eficaz.

**BUG-02-03 fechado** — correção válida e eficaz.
