# Relatório de Reteste QA — Gestão de Obras Musicais (F03)
**Data:** 2026-04-10  
**Sessão:** Reteste Focado — FALHA-A e FALHA-B  
**Ambiente:** http://localhost:5001  
**Auth:** Bearer JWT via Keycloak (analista.teste)  
**Serviço:** cadastro-api processo PID 52880, iniciado 2026-04-10 00:05:08  
**Binário compilado em:** 2026-04-09 23:59:02 (inclui correções)

---

## Contexto

Este reteste verifica dois defeitos corrigidos detectados em sessão QA anterior:

- **FALHA-A:** Filtro ISWC parcial na listagem de obras usava `==` (igualdade exata) ao invés de `Contains`, causando zero resultados para buscas parciais.
- **FALHA-B:** Operações em obra com status DEPURADA retornavam HTTP 422 (Unprocessable Entity) ao invés de HTTP 409 (Conflict), divergindo do contrato da API.

---

## Observação Importante

O processo cadastro-api em execução no momento da solicitação de reteste (PID 12892, iniciado 23:18:59) era anterior à compilação do binário com as correções (23:59:02). Foi necessário reiniciar o serviço (`./dev.sh stop` + `./dev.sh start`) para que o processo carregasse o binário corrigido. O reteste foi executado após a reinicialização.

---

## FALHA-A — Filtro ISWC Parcial (RF-13)

**Correção aplicada:** `ObraRepository.cs` linha 32 — `o.Iswc == filtro.Iswc` substituído por `o.Iswc.Contains(filtro.Iswc)`

**Obra de referência para testes:** Garota de Ipanema (status DEPURADA, ISWC: `T-721428352-3`)

### Caso A-1: Filtro ISWC parcial

- **Request:** `GET /api/v1/obras?iswc=T-721`
- **Esperado:** HTTP 200, total >= 1, retorna obra com ISWC contendo "T-721"
- **Obtido:** HTTP 200, total = 1, retornou "Garota de Ipanema" (ISWC T-721428352-3)
- **Status:** **PASS**

### Caso A-2: Filtro ISWC exato (regressão)

- **Request:** `GET /api/v1/obras?iswc=T-721428352-3`
- **Esperado:** HTTP 200, total = 1, ISWC exato
- **Obtido:** HTTP 200, total = 1, "Garota de Ipanema" com ISWC T-721428352-3
- **Status:** **PASS**

### Caso A-3: Filtro ISWC inexistente

- **Request:** `GET /api/v1/obras?iswc=xyz`
- **Esperado:** HTTP 200, total = 0
- **Obtido:** HTTP 200, total = 0
- **Status:** **PASS**

---

## FALHA-B — HTTP 422 → 409 para Obra DEPURADA

**Correção aplicada:** `ObraMusical.cs` — métodos `Atualizar()` e `MarcarDominioPublico()` agora lançam `StatusConflictException` (mapeada para 409) ao invés de `DomainException` (422) quando status é DEPURADA.

**Obra de referência para testes:** Garota de Ipanema — ID `9f5729f0-0cfc-41dd-9af5-0c90c77623c9` (status DEPURADA)

### Caso B-1: PUT /api/v1/obras/{id} em obra DEPURADA

- **Request:** `PUT /api/v1/obras/9f5729f0-0cfc-41dd-9af5-0c90c77623c9` com body `{"titulo":"Garota de Ipanema Editada","tipo":"MUSICAL","subtitulo":"Editado","genero":"MPB"}`
- **Esperado:** HTTP 409
- **Obtido:** HTTP 409, body: `{"title":"Conflict","status":409,"detail":"Obras depuradas não podem ser editadas","instance":"/api/v1/obras/9f5729f0-0cfc-41dd-9af5-0c90c77623c9"}`
- **Status:** **PASS**

### Caso B-2: PUT /api/v1/obras/{id}/dominio-publico em obra DEPURADA

- **Request:** `PUT /api/v1/obras/9f5729f0-0cfc-41dd-9af5-0c90c77623c9/dominio-publico` com body `{"dominioPublico":true}`
- **Esperado:** HTTP 409
- **Obtido:** HTTP 409, body: `{"title":"Conflict","status":409,"detail":"Obras depuradas não podem ser alteradas","instance":"/api/v1/obras/9f5729f0-0cfc-41dd-9af5-0c90c77623c9/dominio-publico"}`
- **Status:** **PASS**

### Caso B-3: DELETE /api/v1/obras/{id} em obra DEPURADA (regressão)

- **Request:** `DELETE /api/v1/obras/9f5729f0-0cfc-41dd-9af5-0c90c77623c9`
- **Esperado:** HTTP 409 (já era 409 antes — verificação de regressão)
- **Obtido:** HTTP 409, body: `{"title":"Conflict","status":409,"detail":"Obras depuradas não podem ser excluídas.","instance":"/api/v1/obras/9f5729f0-0cfc-41dd-9af5-0c90c77623c9"}`
- **Status:** **PASS**

### Caso B-4: Mensagens de erro no body

| Operação | Mensagem obtida | Status |
|----------|-----------------|--------|
| PUT obras/{id} | "Obras depuradas não podem ser editadas" | PASS |
| PUT obras/{id}/dominio-publico | "Obras depuradas não podem ser alteradas" | PASS |
| DELETE obras/{id} | "Obras depuradas não podem ser excluídas." | PASS |

Todas as mensagens presentes e semanticamente corretas no campo `detail` do response body.

---

## Sumário

| # | Caso de Teste | Falha Original | Status |
|---|---------------|----------------|--------|
| A-1 | Filtro ISWC parcial (iswc=T-721) | Zero resultados | **PASS** |
| A-2 | Filtro ISWC exato (iswc=T-721428352-3) — regressão | N/A | **PASS** |
| A-3 | Filtro ISWC inexistente (iswc=xyz) | N/A | **PASS** |
| B-1 | PUT obras/{id} em DEPURADA → 409 | Retornava 422 | **PASS** |
| B-2 | PUT obras/{id}/dominio-publico em DEPURADA → 409 | Retornava 422 | **PASS** |
| B-3 | DELETE obras/{id} em DEPURADA → 409 — regressão | Já era 409 | **PASS** |
| B-4 | Mensagens de erro no body corretas | N/A | **PASS** |

**Resultado final: 7/7 casos PASS — 0 FAIL — 0 BLOCKED**

Ambas as correções estão funcionando corretamente em produção. Nenhuma regressão detectada.
