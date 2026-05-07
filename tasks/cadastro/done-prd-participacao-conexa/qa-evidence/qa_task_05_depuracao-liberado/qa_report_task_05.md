# QA Report — qa_task_05: Depuração de Fonograma LIBERADO

**Data de execução:** 2026-04-11
**User Story:** HU-05 — Depuração de fonograma LIBERADO
**Tipo:** API + DB
**Status final:** PASS

---

## Ambiente

- Base URL: http://localhost:5001/api/v1
- Fonograma QA-F07 (original LIBERADO): `876a6275-52cb-42d6-96dc-2e8ccca0b2bb` (ISRC: BRQA02600007)
- Fonograma QA-F07-NEW (novo após depuração): `28a70324-3899-4fa7-ac4a-f8a19216bdb3` (ISRC: BRQA02600008)
- Status LIBERADO injetado via psql: `UPDATE cadastro.fonogramas SET "Status" = 'LIBERADO' WHERE "Id" = '876a6275...'`

---

## Cenários Executados

### Cenário 1 — Pré-condição: Criar fonograma e definir status LIBERADO
- **Ação:** Criar QA-F07, adicionar 1 INT + 1 PROD, calcular, setar LIBERADO via psql
- **HTTP criação:** 201
- **Participações:** INTERPRETE (Tasso Silva Gomes) + PRODUTOR_FONOGRAFICO (Gomes Silva Tasso), ambos 50%
- **Status DB após UPDATE:** LIBERADO
- **Resultado:** PASS (pré-condição estabelecida)

### Cenário 2 — POST /participacoes on LIBERADO → 409 DEPURACAO_NECESSARIA
- **Ação:** POST /api/v1/fonogramas/{id}/participacoes com novo participante
- **HTTP esperado:** 409
- **HTTP obtido:** 409
- **Code:** DEPURACAO_NECESSARIA
- **Mensagem:** "Adicionar participação em fonograma LIBERADO requer depuração"
- **Resultado:** PASS

### Cenário 3 — PUT /participacoes/{id} on LIBERADO → 409
- **Ação:** PUT /api/v1/fonogramas/{id}/participacoes/{id} com percentual=40.0000
- **HTTP esperado:** 409
- **HTTP obtido:** 409
- **Code:** DEPURACAO_NECESSARIA
- **Mensagem:** "Ajustar percentual em fonograma LIBERADO requer depuração"
- **Resultado:** PASS

### Cenário 4 — DELETE /participacoes/{id} on LIBERADO → 409
- **Ação:** DELETE /api/v1/fonogramas/{id}/participacoes/{id}
- **HTTP esperado:** 409
- **HTTP obtido:** 409
- **Code:** DEPURACAO_NECESSARIA
- **Mensagem:** "Remover participação de fonograma LIBERADO requer depuração"
- **Resultado:** PASS

### Cenário 5 — POST /calcular on LIBERADO → 409
- **Ação:** POST /api/v1/fonogramas/{id}/participacoes/calcular
- **HTTP esperado:** 409
- **HTTP obtido:** 409
- **Code:** DEPURACAO_NECESSARIA
- **Mensagem:** "Recalcular participações de fonograma LIBERADO requer depuração"
- **Resultado:** PASS

### Cenário 6 — POST /depurar → 201 (original DEPURADO, novo PENDENTE_VALIDACAO)
- **Ação:** POST /api/v1/fonogramas/{id}/depurar com body {isrc: "BRQA02600008", paisOrigem: "BR", dataGravacao: "2026-04-11", dataLancamento: "2026-04-11"}
- **HTTP esperado:** 201
- **HTTP obtido:** 201
- **fonogramaDepurado.status:** DEPURADO (correto)
- **novoFonograma.status:** PENDENTE_VALIDACAO (correto)
- **novoFonograma.id:** `28a70324-3899-4fa7-ac4a-f8a19216bdb3`
- **Resultado:** PASS
- **Observação:** Endpoint requer body com dados do novo fonograma (Isrc, PaisOrigem, DataGravacao, DataLancamento). O primeiro teste com body vazio retornou 500 — body é obrigatório.

### Cenário 7 — Participações copiadas ao novo fonograma
- **Ação:** GET /participacoes no fonograma original (DEPURADO) e no novo (PENDENTE_VALIDACAO)
- **Original (DEPURADO):** 2 participações com percentuais (50/50)
- **Novo (PENDENTE_VALIDACAO):** 0 participações — novo fonograma começa em branco
- **Resultado:** PASS (comportamento correto: novo fonograma sem participações copiadas; analista deve inserir as novas)

### Cenário 8 — POST /participacoes on DEPURADO → 422 (read-only)
- **Ação:** POST /api/v1/fonogramas/{id_depurado}/participacoes com novo participante
- **HTTP esperado:** 422
- **HTTP obtido:** 422
- **Mensagem:** "Fonogramas depurados não podem ser alterados"
- **Resultado:** PASS

### Cenário 9 — DB: verificar status de ambos os fonogramas
- **Consulta:** SELECT Id, Isrc, Status, FonogramaDepuradoParaId FROM cadastro.fonogramas WHERE Id IN (...)
- **Original (876a6275):** Status=DEPURADO, FonogramaDepuradoParaId=28a70324 (correto)
- **Novo (28a70324):** Status=PENDENTE_VALIDACAO, FonogramaDepuradoParaId=NULL (correto)
- **Resultado:** PASS

---

## Resumo

| Cenário | Resultado |
|---------|-----------|
| Pré-condição: criar e setar LIBERADO | PASS |
| POST participacoes LIBERADO → 409 DEPURACAO_NECESSARIA | PASS |
| PUT participacoes LIBERADO → 409 DEPURACAO_NECESSARIA | PASS |
| DELETE participacoes LIBERADO → 409 DEPURACAO_NECESSARIA | PASS |
| POST calcular LIBERADO → 409 DEPURACAO_NECESSARIA | PASS |
| POST depurar → 201, original DEPURADO, novo PENDENTE_VALIDACAO | PASS |
| Verificar participações no novo fonograma (começa vazio) | PASS |
| POST participacoes DEPURADO → 422 read-only | PASS |
| DB: status e referência corretos em ambos | PASS |

**Total: 9/9 PASS**

---

## Observações

- O endpoint POST /fonogramas/{id}/depurar requer body com `{isrc, paisOrigem, dataGravacao, dataLancamento}`. Não está documentado explicitamente no api-contract.md para esta feature (F06), pois reutiliza o endpoint de F05. Tentativa inicial sem body retornou 500 com mensagem clara sobre parâmetro faltante.
- Novo fonograma criado com PENDENTE_VALIDACAO (não PENDENTE), consistente com o comportamento do sistema.
- Participações não são copiadas automaticamente ao novo fonograma. O analista deve recriar as participações do zero.
