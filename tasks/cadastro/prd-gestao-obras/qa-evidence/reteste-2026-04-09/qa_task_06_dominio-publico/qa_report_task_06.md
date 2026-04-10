# QA Report — qa_task_06: HU-05 Marcar Obra como Domínio Público
**Reteste:** 2026-04-10
**Ambiente:** http://localhost:5001 (API)
**Auth:** Bearer JWT (analista.teste)

---

## Resumo

| CT | Descrição | Esperado | Obtido | Status |
|----|-----------|----------|--------|--------|
| CT-01 | PUT /obras/{id}/dominio-publico true — obra PENDENTE | HTTP 200, status=DOMINIO_PUBLICO, dominioPublico=true | HTTP 200, status=DOMINIO_PUBLICO, dominioPublico=True | PASS |
| CT-02 | PUT dominio-publico false — desmarcar (DOMINIO_PUBLICO → PENDENTE) | HTTP 200, status=PENDENTE, dominioPublico=false | HTTP 200, status=PENDENTE, dominioPublico=False | PASS |
| CT-03 | PUT dominio-publico true — obra LIBERADA (com ISWC) | HTTP 200, status=DOMINIO_PUBLICO | HTTP 200, status=DOMINIO_PUBLICO, dominioPublico=True | PASS |
| CT-04 | PUT dominio-publico false — desmarcar de obra LIBERADA | HTTP 200, status=LIBERADO (pois tem ISWC) | HTTP 200, status=LIBERADO, dominioPublico=False | PASS |
| CT-05 | PUT dominio-publico em obra DEPURADA → deve falhar | HTTP 409 | HTTP 422, "Obras depuradas não podem ser alteradas" | FAIL |
| CT-06 | Verificar persistência no banco | dominioPublico atualizado | Confirmado via psql | PASS |

**Resultado: 5/6 PASS | 1 FAIL**

---

## Evidência de Falha

### CT-05 FAIL: PUT dominio-publico em obra DEPURADA retorna HTTP 422 (esperado 409)

**Request:** PUT /api/v1/obras/9f5729f0-0cfc-41dd-9af5-0c90c77623c9/dominio-publico
**Body:** `{"dominioPublico":true}`

**Response recebida (422):**
```json
{
    "title": "Unprocessable Entity",
    "status": 422,
    "detail": "Obras depuradas não podem ser alteradas",
    "instance": "/api/v1/obras/.../dominio-publico"
}
```

O API Contract define HTTP 409 para "Operação não permitida para o status atual da obra".
O servidor retornou HTTP 422 para esta operação em obra DEPURADA.

Esta é a mesma divergência identificada em qa_task_03 CT-07 — parece ser um padrão sistemático: a API retorna 422 em vez de 409 para operações bloqueadas por status DEPURADA.

---

## Observações

1. CT-04 PASS: A lógica de reversão de status é correta — ao desmarcar DP de uma obra com ISWC, o status volta para LIBERADO (não PENDENTE).
2. CT-02 PASS: Ao desmarcar de obra PENDENTE (sem ISWC), o status volta para PENDENTE.
3. A flag `dominioPublico` é atualizada corretamente no banco.
4. O endpoint aceita somente body `{"dominioPublico": boolean}` conforme spec.

**STATUS FINAL: FAIL** (1 falha — HTTP 422 vs 409 para obra DEPURADA)
