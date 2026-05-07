# QA Report — qa_task_05 — HU-05: Depuracao ao Alterar Titulares de Obra LIBERADA

**Data:** 2026-04-10
**Status:** FAIL — RF-23 nao implementado (titularidades nao copiadas para nova obra)
**Ambiente:** http://localhost:5001/api/v1
**Obra LIBERADA usada:** `d17d2745-1c47-4c6c-bb2d-db7985c2bfbf` (Meu Bem Querer QA Editado, ISWC T-006363513-2)

---

## Cenarios Executados

| # | Cenario | Esperado | Obtido | HTTP Esperado | HTTP Obtido | Status |
|---|---------|----------|--------|---------------|-------------|--------|
| T5-1 | Obra LIBERADA com titularidades | Confirmar estado | Obra LIBERADA, 1 titularidade (Gomes Silva Tasso, AUTOR, 100%), somaCompleta=true | - | 200 | PASS (setup) |
| T5-3 | POST titularidade em obra LIBERADA | 409 DEPURACAO_NECESSARIA | 409, code="DEPURACAO_NECESSARIA", detail="Alterar titulares de uma obra LIBERADA requer depuração" | 409 | 409 | PASS |
| T5-4 | PUT titularidade em obra LIBERADA | 409 DEPURACAO_NECESSARIA | 409, code="DEPURACAO_NECESSARIA", detail="Alterar titulares de uma obra LIBERADA requer depuração" | 409 | 409 | PASS |
| T5-5 | DELETE titularidade em obra LIBERADA | 409 DEPURACAO_NECESSARIA | 409, code="DEPURACAO_NECESSARIA", detail="Alterar titulares de uma obra LIBERADA requer depuração" | 409 | 409 | PASS |
| T5-6 | POST /depurar com corpo errado ({novasTitularidades}) | N/A | 500 "Object reference not set" — contrato incorreto testado inicialmente | - | 500 | N/A (erro de teste) |
| T5-6c | POST /depurar com contrato correto {Titulo, Tipo, Subtitulo, Genero} | 201, obra original DEPURADA, nova obra PENDENTE | 201, obraDepurada.status=DEPURADA, novaObra.status=PENDENTE, obraDepurada.iswc mantido | 201 | 201 | PASS |
| T5-7 | POST titularidade em obra DEPURADA | 422 "Obras depuradas nao podem ser alteradas" | 422, detail="Obras depuradas não podem ser alteradas" | 422 | 422 | PASS |
| T5-8 | PUT titularidade em obra DEPURADA | 422 | 422, detail="Obras depuradas não podem ser alteradas" | 422 | 422 | PASS |
| T5-9 | DELETE titularidade em obra DEPURADA | 422 | 422, detail="Obras depuradas não podem ser alteradas" | 422 | 422 | PASS |
| T5-10 | DELETE obra DEPURADA (com titularidades) | 409 PossuiVinculos | 409, detail="Obras depuradas não podem ser excluídas." | 409 | 409 | PASS (protecao existe, msg diferente) |
| T5-10b | DELETE obra PENDENTE com titularidades | 409 PossuiVinculos | 409, detail="Obra não pode ser excluída pois possui titularidades autorais vinculadas." | 409 | 409 | PASS |
| T5-11 | DELETE titular com titularidades | 409 PossuiVinculos | 409, detail="Titular não pode ser excluído pois possui vínculos com obras ou fonogramas" | 409 | 409 | PASS |
| T5-12 | DB: obra original DEPURADA, nova obra PENDENTE | Obra original DEPURADA com ISWC, nova obra PENDENTE sem ISWC | Confirmado: d17d2745=DEPURADA+ISWC, 687e71d3=PENDENTE sem ISWC | - | - | PASS |
| T5-RF23 | DB: titularidades copiadas para nova obra | Nova obra com titularidades copiadas (Gomes Silva Tasso, AUTOR, 100%) | Nova obra com 0 titularidades | - | - | FAIL |

---

## FALHA CRITICA — RF-23: Titularidades nao copiadas para nova obra

**Requisito RF-23:** "Ao confirmar: obra original → DEPURADA, nova obra criada → PENDENTE (sem ISWC), as titularidades da obra original são copiadas para a nova obra com as alterações aplicadas"

**Evidencia API:**
```
GET /obras/687e71d3-bb02-42ba-9b82-778c7353b70c/titularidades
Response: {"titularidades": [], "somaPercentual": 0, "somaCompleta": false}
```

**Evidencia Banco:**
```sql
SELECT ta.* FROM cadastro.titularidades_autorais ta
WHERE ta."ObraId" IN ('d17d2745-...', '687e71d3-...')
-- Resultado: apenas 1 registro (obra depurada), nova obra tem 0 registros
```

**Impacto:** ALTO — a nova obra criada pela depuracao nasce sem titularidades. O Analista precisa re-adicionar todos os titulares manualmente apos cada depuracao, o que contradiz o RF-23 e o criterio de aceitacao descrito no PRD.

---

## Observacao — Contrato do Endpoint /depurar

O endpoint `POST /obras/{id}/depurar` aceita `{titulo, tipo, subtitulo?, genero?}` e NAO inclui titularidades como parametro. A copia automatica das titularidades deveria ocorrer internamente no handler `DepurarObraCommandHandler`, mas nao foi implementada.

---

## Banco de Dados (Validacao T5-12)

```
Id                                   | Titulo                    | Status   | ObraDepuradaParaId                   | Iswc
687e71d3-bb02-42ba-9b82-778c7353b70c | Meu Bem Querer QA Editado | PENDENTE |                                      |
d17d2745-1c47-4c6c-bb2d-db7985c2bfbf | Meu Bem Querer QA Editado | DEPURADA | 687e71d3-bb02-42ba-9b82-778c7353b70c | T-006363513-2
```

Relacao obraDepuradaParaId corretamente configurada.
ISWC preservado na obra original depurada.
Nova obra sem ISWC (correto).

---

## Resultado: FAIL
RF-23 nao implementado: titularidades nao sao copiadas para a nova obra na depuracao.
Demais cenarios de protecao (409 em LIBERADA, 422 em DEPURADA, FK restrictions) todos funcionam corretamente.
