# QA Report — qa_task_04: Recálculo ao Alterar Composição

**Data de execução:** 2026-04-11
**User Story:** HU-04 — Recálculo ao alterar composição (flag percentuaisDesatualizados)
**Tipo:** API
**Status final:** PASS

---

## Ambiente

- Base URL: http://localhost:5001/api/v1
- Fonograma usado: QA-F03 `fd9a8166-6fe8-4c12-a676-7cef6266dcde`
  - Estado inicial após task_03: 2 INT + 1 PROD + 2 MUS, com ajustes manuais (INT1=30.0, INT2=13.7)
- Titular adicionado para teste: QA Titular T04 Revalidado (`8f445fc6-80ea-49f4-b744-b5972820bbdb`)

---

## Cenários Executados

### Cenário 1 — POST add participant → percentuaisDesatualizados=true
- **Ação:** POST /api/v1/fonogramas/{id}/participacoes com novo intérprete (QA Titular T04 Revalidado)
- **HTTP esperado:** 201
- **HTTP obtido:** 201
- **percentuaisDesatualizados esperado:** true
- **percentuaisDesatualizados obtido:** true
- **Total participações:** 6 (passou de 5 para 6)
- **Resultado:** PASS

### Cenário 2 — POST /calcular → recalcular (ajustes manuais descartados)
- **Ação:** POST /api/v1/fonogramas/{id}/participacoes/calcular
- **HTTP esperado:** 200
- **HTTP obtido:** 200
- **Estado anterior:** percentuais manuais (30.0/13.7) + percentuaisDesatualizados=true
- **Após recálculo:**
  - PRODUTOR (Editora de Teste): 41.7%
  - INTERPRETE (Gomes Silva Tasso): 14.5668% (primeiro, recebeu remainder de 3 INT)
  - INTERPRETE (Tasso Silva Gomes): 14.5666%
  - INTERPRETE (QA Titular T04 Revalidado): 14.5666%
  - MUSICO (Gomes Silva Tasso): 7.3%
  - MUSICO (Tasso Silva Gomes): 7.3%
- **somaPercentual:** 100.0000
- **percentuaisDesatualizados:** false (após recálculo)
- **Verificação:** Ajustes manuais (30.0, 13.7) foram descartados — distribuição igualitária aplicada
- **Resultado:** PASS

### Cenário 3 — DELETE participant → percentuaisDesatualizados=true
- **Ação:** DELETE /api/v1/fonogramas/{id}/participacoes/{QA Titular T04 ID}
- **HTTP esperado:** 200
- **HTTP obtido:** 200
- **percentuaisDesatualizados esperado:** true
- **percentuaisDesatualizados obtido:** true
- **Total participações:** 5 (voltou para 5)
- **Resultado:** PASS

---

## Resumo

| Cenário | Resultado |
|---------|-----------|
| POST add participant → percentuaisDesatualizados=true | PASS |
| POST calcular → recalcula, ajustes manuais descartados | PASS |
| DELETE participant → percentuaisDesatualizados=true | PASS |

**Total: 3/3 PASS**
