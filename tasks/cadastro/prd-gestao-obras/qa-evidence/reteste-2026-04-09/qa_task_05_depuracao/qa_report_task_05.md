# QA Report — qa_task_05: RF-06 a RF-10 Depuração Automática
**Reteste:** 2026-04-10
**Ambiente:** http://localhost:5001 (API)
**Auth:** Bearer JWT (analista.teste)

---

## Resumo

| CT | Descrição | Esperado | Obtido | Status |
|----|-----------|----------|--------|--------|
| CT-01 [RF-06] | PUT obra LIBERADA com novo título → 409 DEPURACAO_NECESSARIA | HTTP 409, code=DEPURACAO_NECESSARIA | HTTP 409, code=DEPURACAO_NECESSARIA, detail="Alterar o título requer depuração" | PASS |
| CT-02 [RF-07] | POST /depurar — cria nova obra, original fica DEPURADA | HTTP 201, DepuracaoResponse com obraDepurada+novaObra | HTTP 201, obraDepurada.status=DEPURADA, novaObra.status=PENDENTE | PASS |
| CT-03 [RF-07] | Verificar obra original após depuração — status DEPURADA, ISWC mantido, obraDepuradaParaId | status=DEPURADA, iswc mantido, FK correta | Todos os campos corretos | PASS |
| CT-04 [RF-07/RF-09] | Verificar nova obra — status PENDENTE, iswc null, título novo | status=PENDENTE, iswc=null | Confirmado | PASS |
| CT-05 [RF-08] | PUT obra DEPURADA → imutável | HTTP 409 (spec) ou 422 | HTTP 422, "Obras depuradas não podem ser editadas" | FAIL (422 vs 409) |
| CT-06 [RF-10] | PUT obra LIBERADA com título inalterado + só tipo/gênero/subtítulo — sem depuração | HTTP 200 | HTTP 200, tipo=LITEROMUSICAL, genero=Bossa Nova | PASS |
| CT-07 [RF-07] | Verificar persistência no banco — FK ObraDepuradaParaId | Ambas as obras no banco com FK correta | Confirmado via psql | PASS |
| CT-08 [RF-07] | POST /depurar em obra DEPURADA → 409 | HTTP 409 | HTTP 409, "Apenas obras LIBERADAS podem ser depuradas." | PASS |
| CT-09 [RF-07] | POST /depurar em obra PENDENTE → 409 | HTTP 409 | HTTP 409, "Apenas obras LIBERADAS podem ser depuradas." | PASS |

**Resultado: 8/9 PASS | 1 FAIL**

---

## Evidências

### CT-02: DepuracaoResponse completo
```json
{
  "obraDepurada": {
    "id": "c49adc4e-2aa1-4386-8ee4-121c91e3b901",
    "titulo": "Obra de Teste Depurar",
    "iswc": "T-334367645-6",
    "status": "DEPURADA",
    "obraDepuradaParaId": "e4d641c8-b267-49a9-aa10-0de720d74096"
  },
  "novaObra": {
    "id": "e4d641c8-b267-49a9-aa10-0de720d74096",
    "titulo": "Obra de Teste Depurar VERSAO NOVA",
    "iswc": null,
    "status": "PENDENTE",
    "obraDepuradaParaId": null
  }
}
```

### CT-07: Banco de Dados
```
Id                                    | Titulo                            | Status   | Iswc          | ObraDepuradaParaId
c49adc4e-2aa1-4386-8ee4-121c91e3b901 | Obra de Teste Depurar             | DEPURADA | T-334367645-6 | e4d641c8-b267-49a9-aa10-0de720d74096
e4d641c8-b267-49a9-aa10-0de720d74096 | Obra de Teste Depurar VERSAO NOVA | PENDENTE | NULL          | NULL
```

---

## Falha Identificada

### CT-05 FAIL: PUT obra DEPURADA retorna HTTP 422 (esperado 409)

Mesmo padrão identificado nas tasks 03 e 06. O API Contract especifica HTTP 409 para operações bloqueadas por status inválido, porém o servidor retorna HTTP 422 para operações em obras DEPURADA.

Esta é uma divergência sistemática: aparece em PUT /obras/{id}, PUT /obras/{id}/dominio-publico quando a obra está DEPURADA.

---

## Observações

1. O mecanismo de depuração transacional funciona corretamente — ambas as operações (marcar original como DEPURADA + criar nova obra) são persistidas atomicamente.
2. O campo `obraDepuradaParaId` é preenchido corretamente com o ID da nova obra.
3. A nova obra nasce sem fonogramas (confirmado pela ausência de fonogramas vinculados).
4. O ISWC original é mantido na obra DEPURADA (imutável).
5. RF-10 verificado: alteração de tipo/gênero/subtítulo em obra LIBERADA não dispara depuração.

**STATUS FINAL: FAIL** (1 falha — HTTP 422 vs 409 para PUT em obra DEPURADA; mesmo padrão das tasks 03 e 06)
