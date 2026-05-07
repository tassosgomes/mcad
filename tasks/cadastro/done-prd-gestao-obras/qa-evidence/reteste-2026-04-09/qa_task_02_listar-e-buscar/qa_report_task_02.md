# QA Report — qa_task_02: HU-03 Buscar Obra na Listagem
**Reteste:** 2026-04-10
**Ambiente:** http://localhost:5001 (API)
**Auth:** Bearer JWT (analista.teste)

---

## Resumo

| CT | Descrição | Esperado | Obtido | Status |
|----|-----------|----------|--------|--------|
| CT-01 | GET /obras sem filtros — paginação default | HTTP 200, page=1, size=20 | HTTP 200, total=23, page=1, size=20, 20 itens | PASS |
| CT-02 | Paginação size=5 | HTTP 200, 5 itens | HTTP 200, 5 itens retornados | PASS |
| CT-03 | Filtro titulo=meu (parcial, case-insensitive) | Obras contendo "meu" | 7 obras retornadas, todas contêm "meu" | PASS |
| CT-04 | Filtro tipo=LITEROMUSICAL (exato) | Somente LITEROMUSICAL | 8 obras, tipo único = LITEROMUSICAL | PASS |
| CT-05 | Filtro status=DEPURADA | Somente DEPURADA | 2 obras, status único = DEPURADA | PASS |
| CT-06 | Filtro iswc=T-721 (parcial) | 1 obra com ISWC contendo T-721 | 0 obras retornadas (ISWC exato T-721428352-3 retorna 1) | FAIL |
| CT-07 | sort=titulo ASC | Títulos ordenados ASC | Ordenados ASC corretamente | PASS |
| CT-08 | sort=-titulo DESC | Títulos ordenados DESC | Ordenados DESC corretamente | PASS |
| CT-09 | Filtro genero=MPB | Obras com gênero MPB | 5 obras retornadas com genero=MPB | PASS |
| CT-10 | Página 2 (page=2, size=20, total=23) | 3 itens na segunda página | page=2, 3 itens retornados | PASS |

**Resultado: 9/10 PASS | 1 FAIL**

---

## Evidência de Falha

### CT-06 FAIL: Filtro ISWC parcial não funciona

O RF-13 especifica: "Filtros: (...) ISWC (parcial)".

Comportamento observado:
- `GET /obras?iswc=T-721` → 0 resultados
- `GET /obras?iswc=T-721428352-3` (valor exato) → 1 resultado
- `GET /obras?iswc=721` → 0 resultados
- `GET /obras?iswc=T-7214` → 0 resultados

O banco contém a obra "Garota de Ipanema" com ISWC `T-721428352-3`, confirmado via psql.

**Conclusão:** O filtro ISWC está implementado como busca exata (`=`), não como busca parcial (`ILIKE '%valor%'`). Diverge do RF-13.

---

## Observações

1. A estrutura de resposta está correta: `{ data: [...], pagination: { page, size, total, totalPages } }`
2. A paginação funciona corretamente (page, size, totalPages calculado)
3. O filtro por título funciona corretamente com busca parcial case-insensitive
4. O filtro por tipo funciona como exato (correto conforme spec)
5. O filtro por status funciona como exato (correto conforme spec)
6. O filtro por gênero funciona corretamente (parcial)
7. A ordenação por título funciona em ambas as direções (ASC/DESC)

**STATUS FINAL: FAIL** (1 falha — filtro ISWC parcial não funciona)
