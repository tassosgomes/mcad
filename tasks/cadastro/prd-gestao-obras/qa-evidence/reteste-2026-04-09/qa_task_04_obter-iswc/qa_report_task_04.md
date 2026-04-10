# QA Report — qa_task_04: HU-02 Obter ISWC via API Externa
**Reteste:** 2026-04-10
**Ambiente:** http://localhost:5001 (API) | API externa: https://iswc.tasso.dev.br/
**Auth:** Bearer JWT (analista.teste)

---

## Resumo

| CT | Descrição | Esperado | Obtido | Status |
|----|-----------|----------|--------|--------|
| CT-01 | POST /obras/{id}/iswc — obra PENDENTE com titular autoral | HTTP 200, iswc preenchido, status=LIBERADO | HTTP 200, iswc=T-006363513-2, status=LIBERADO | PASS |
| CT-02 | GET /obras/{id} — verificar ISWC persistido | ISWC no response e status=LIBERADO | iswc=T-006363513-2, status=LIBERADO | PASS |
| CT-03 | Criar segunda obra e adicionar mesmo titular | Obra criada e titular adicionado | OK — obra 89f12397 com titular | PASS |
| CT-04 | POST /iswc em obra LIBERADA (já tem ISWC) | HTTP 422 — obra não está PENDENTE | HTTP 422, "ISWC só pode ser solicitado para obras PENDENTES." | PASS |
| CT-05 | POST /iswc em obra SEM titulares autorais | HTTP 422 — sem titulares | HTTP 422, "A obra deve ter titulares autorais para obter ISWC." | PASS |
| CT-06 | Verificar ISWC no banco (persistência) | Registro com ISWC correto | Confirmado: T-006363513-2 em obras_musicais | PASS |
| CT-07 | Verificar índice único de ISWC no banco | UNIQUE INDEX em Iswc (WHERE NOT NULL) | uq_obras_iswc confirmado via pg_indexes | PASS |
| CT-08 | POST /iswc segunda obra — API retorna ISWC diferente | HTTP 200, ISWC diferente | HTTP 200, iswc=T-541233038-7 (diferente) | PASS |

**Resultado: 8/8 PASS**

---

## Evidências

### CT-01: Obtenção de ISWC com sucesso
```
Request: POST http://localhost:5001/api/v1/obras/d17d2745.../iswc
Headers: Authorization: Bearer JWT
(sem body)

Response 200:
{
  "id": "d17d2745-1c47-4c6c-bb2d-db7985c2bfbf",
  "titulo": "Meu Bem Querer QA Editado",
  "iswc": "T-006363513-2",
  "status": "LIBERADO"
}
```

### CT-04: Obra já com ISWC → 422
```
Response 422:
{"title":"Unprocessable Entity","status":422,"detail":"ISWC só pode ser solicitado para obras PENDENTES."}
```

### CT-05: Sem titulares → 422
```
Response 422:
{"title":"Unprocessable Entity","status":422,"detail":"A obra deve ter titulares autorais para obter ISWC."}
```

### CT-07: Índice único confirmado
```sql
CREATE UNIQUE INDEX uq_obras_iswc ON cadastro.obras_musicais USING btree ("Iswc") WHERE ("Iswc" IS NOT NULL)
```

---

## Observações

1. A API externa https://iswc.tasso.dev.br/ está respondendo corretamente.
2. O status da obra muda de PENDENTE para LIBERADO ao obter o ISWC (comportamento esperado — RF-18).
3. O ISWC é salvo imediatamente na obra após obtenção.
4. O endpoint não requer body (POST sem payload).
5. A mensagem de erro para obra sem titulares diverge ligeiramente do PRD: o PRD diz "Adicione titulares autorais antes de obter o ISWC" (tooltip UI) e a API retorna "A obra deve ter titulares autorais para obter ISWC." — semanticamente equivalente.
6. Não foi possível testar o cenário de API externa indisponível (502) pois a API está disponível.
7. Não foi possível testar ISWC duplicado pois a API retorna ISWCs únicos para obras diferentes.

**STATUS FINAL: PASS**
