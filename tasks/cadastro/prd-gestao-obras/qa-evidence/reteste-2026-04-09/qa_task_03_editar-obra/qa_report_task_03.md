# QA Report — qa_task_03: HU-04 Editar Dados da Obra
**Reteste:** 2026-04-10
**Ambiente:** http://localhost:5001 (API)
**Auth:** Bearer JWT (analista.teste)

---

## Resumo

| CT | Descrição | Esperado | Obtido | Status |
|----|-----------|----------|--------|--------|
| CT-01 | PUT obra PENDENTE — editar título | HTTP 200, título atualizado | HTTP 200, titulo=Meu Bem Querer QA Editado, status=PENDENTE | PASS |
| CT-02 | PUT obra PENDENTE — editar subtítulo e gênero | HTTP 200, campos atualizados | HTTP 200, subtitulo=Versao Acustica, genero=Samba | PASS |
| CT-03 [F2] | PUT com titulo="" → deve retornar 400 (bug anterior: 200) | HTTP 400 | HTTP 400, `{"detail":"Título é obrigatório."}` | PASS ✓ CORRIGIDO |
| CT-04 [F2] | PUT com titulo=null → deve retornar 400 | HTTP 400 | HTTP 400, `{"detail":"Título é obrigatório."}` | PASS ✓ CORRIGIDO |
| CT-05 [F5] | PUT obra LIBERADA sem mudar título — edição livre | HTTP 200 | HTTP 200, status=LIBERADO, ISWC mantido | PASS |
| CT-06 [F5] | PUT obra LIBERADA COM mudança de título → 409 DEPURACAO_NECESSARIA | HTTP 409 com code | HTTP 409, code=DEPURACAO_NECESSARIA | PASS |
| CT-07 [F5] | PUT obra DEPURADA → deve ser rejeitada | HTTP 409 | HTTP 422 (mensagem correta: "Obras depuradas não podem ser editadas") | FAIL |
| CT-08 [F5] | PUT obra LIBERADA — só subtitulo/tipo/genero sem depuração | HTTP 200 | HTTP 200, tipo=LITEROMUSICAL, genero=Jazz | PASS |
| CT-09 [F5] | Verificar persistência no banco | Dados atualizados no DB | Confirmado: Tipo=LITEROMUSICAL, Genero=Jazz, Subtitulo=Subtitulo Novo | PASS |

**Resultado: 8/9 PASS | 1 FAIL**

---

## Evidência de Falha

### CT-07 FAIL: PUT obra DEPURADA retorna HTTP 422 (esperado 409)

**Request:** PUT /api/v1/obras/9f5729f0-0cfc-41dd-9af5-0c90c77623c9

**Response recebida (422):**
```json
{
    "title": "Unprocessable Entity",
    "status": 422,
    "detail": "Obras depuradas não podem ser editadas",
    "instance": "/api/v1/obras/9f5729f0-0cfc-41dd-9af5-0c90c77623c9"
}
```

A mensagem está semanticamente correta e o comportamento de rejeição está correto.
Porém o API Contract e a techspec definem HTTP 409 (Conflict) para esta situação.
O servidor retornou HTTP 422 (Unprocessable Entity), que é semanticamente diferente.

---

## Falhas Anteriores — Status no Reteste

| Falha | Descrição | Status |
|-------|-----------|--------|
| [F2] | PUT com titulo vazio retornava HTTP 200 (esperado 400/422) | CORRIGIDO — agora retorna 400 |
| [F5] | CTs 07/08/09 não executados anteriormente | EXECUTADOS — CT-07 revelou nova falha (422 vs 409) |

---

## Observações

1. CT-06 PASS: A lógica de depuração dispara corretamente quando título é alterado em obra LIBERADA.
2. O code `DEPURACAO_NECESSARIA` está presente no response 409, conforme esperado pelo frontend.
3. CT-08/09 PASS: Alteração de subtítulo/tipo/gênero em obra LIBERADA sem depuração funciona corretamente.
4. F2 RESOLVIDA: Validação de título vazio agora retorna 400 para PUT, assim como para POST.
5. CT-07 nova divergência identificada: HTTP 422 vs 409 esperado para obra DEPURADA.

**STATUS FINAL: FAIL** (1 falha — HTTP 422 vs 409 para PUT em obra DEPURADA)
