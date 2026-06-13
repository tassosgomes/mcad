# Relatório de QA – Task 07: Detalhes do Pagamento

**Task ID:** `qa_task_07`  
**Slug:** `detalhes_pagamento`  
**User Story:** HU-05 — Visualizar detalhes do pagamento  
**Data de execução:** 2026-06-10  
**URL base:** `https://mcad.tasso.dev.br`  
**Testador:** QA Task Runner (automatizado)  
**Status Geral:** **FAIL** (1 caso de 4 com falha)

---

## Resumo Executivo

Foram executados 4 casos de teste (CT-01 a CT-04) cobrindo consulta API por ID existente, consulta API por ID inexistente, visualização de detalhes via UI e validação de formatos de dados. **3 PASS, 1 FAIL**. A falha está em CT-04: a API retorna o campo `cnpjFormatado` no objeto `licenca.usuarioMusica`, enquanto o PRD/techspec especifica o campo como `cnpj`. Isso é uma inconsistência no contrato de API.

---

## Evidências

- **Diretório de evidências:** `tasks/arrecadacao/prd-registro-pagamentos/qa-evidence/qa_task_07_detalhes_pagamento/`
- **CT-01 response:** `ct01_response.json`
- **CT-02 response:** `ct02_response.json`
- **CT-03 screenshot:** `screenshots/ct03_detalhes_ui.png`
- **CT-04 validação:** `ct04_validation.txt`

---

## Casos de Teste

### CT-01: Buscar pagamento por ID existente

| Campo | Esperado | Atual | Status |
|---|---|---|---|
| HTTP Status | 200 | 200 | ✅ PASS |
| `id` | `fa24bdf6-6832-4668-a691-1ee3e298b14d` | `fa24bdf6-6832-4668-a691-1ee3e298b14d` | ✅ PASS |
| `licenca.id` | `72ad4fb1-003f-4bb3-9ea5-f6a4b220488a` | `72ad4fb1-003f-4bb3-9ea5-f6a4b220488a` | ✅ PASS |
| `licenca.status` | `ATIVA` | `ATIVA` | ✅ PASS |
| `licenca.usuarioMusica.id` | presente | `0b7645c5-dd38-46dd-ba1a-7c784f1b09b2` | ✅ PASS |
| `licenca.usuarioMusica.razaoSocial` | presente | `Bossa Cinema 00039 Entretenimento Ltda` | ✅ PASS |
| `licenca.usuarioMusica.cnpj` | presente | `cnpjFormatado` | ⚠️ Ver CT-04 |
| `licenca.rubrica.id` | presente | `d4e5f6a7-b8c9-0123-defa-234567890123` | ✅ PASS |
| `licenca.rubrica.sigla` | presente | `CINEMA` | ✅ PASS |
| `licenca.rubrica.nome` | presente | `Cinema` | ✅ PASS |
| `quantidadeUdas` | `"2.500000"` | `"2.500000"` | ✅ PASS |
| `valorUdaNoMomento` | `"107.310000"` | `"107.310000"` | ✅ PASS |
| `valorBruto` | `"268.275000"` | `"268.275000"` | ✅ PASS |
| `periodo` | `"2026-06"` | `"2026-06"` | ✅ PASS |
| `status` | `"CONFIRMADO"` | `"CONFIRMADO"` | ✅ PASS |
| `dataRegistro` | ISO 8601 | `2026-06-10T23:48:52.799326Z` | ✅ PASS |
| `criadoEm` | ISO 8601 | `2026-06-10T23:48:52.799326Z` | ✅ PASS |
| `atualizadoEm` | ISO 8601 | `2026-06-10T23:48:52.799326Z` | ✅ PASS |

**Resultado:** ✅ **PASS**

---

### CT-02: Buscar pagamento por ID inexistente

| Campo | Esperado | Atual | Status |
|---|---|---|---|
| HTTP Status | 404 | 404 | ✅ PASS |
| Body | ProblemDetails (RFC 7807) | ProblemDetails com `type`, `title`, `status`, `detail`, `instance` | ✅ PASS |
| `detail` | mensagem de "não encontrado" | `Pagamento nao encontrado: a1b2c3d4-e5f6-7890-abcd-ef1234567890` | ✅ PASS |

**Resultado:** ✅ **PASS**

---

### CT-03: Visualizar detalhes via UI

| Campo | Esperado | Atual | Status |
|---|---|---|---|
| Navegação para lista de pagamentos | Sucesso | `/arrecadacao/pagamentos` | ✅ PASS |
| Clique no pagamento de referência | Abre detalhes | `/arrecadacao/pagamentos/fa24bdf6-6832-4668-a691-1ee3e298b14d` | ✅ PASS |
| Título da página | Pagamento #FA24BDF6 | `Pagamento #FA24BDF6` | ✅ PASS |
| Status renderizado | Confirmado | `Confirmado` | ✅ PASS |
| Período | 2026-06 | `2026-06` | ✅ PASS |
| QTD UDAs | 2,5 | `2,5` | ✅ PASS |
| Valor UDA | R$ 107,31 | `R$ 107,31` | ✅ PASS |
| Valor Bruto | R$ 268,28 | `R$ 268,28` | ✅ PASS |
| Usuário de Música | Bossa Cinema 00039 Entretenimento Ltda | `Bossa Cinema 00039 Entretenimento Ltda` | ✅ PASS |
| Rubrica | CINEMA Cinema | `CINEMA` + `Cinema` | ✅ PASS |
| Status da Licença | ATIVA | `ATIVA` | ✅ PASS |

**Screenshot:** `screenshots/ct03_detalhes_ui.png`  
**Resultado:** ✅ **PASS**

---

### CT-04: Validar formato dos valores

| Campo | Esperado | Atual | Status |
|---|---|---|---|
| `quantidadeUdas` tipo | `string` | `string` | ✅ PASS |
| `valorUdaNoMomento` tipo | `string` | `string` | ✅ PASS |
| `valorBruto` tipo | `string` | `string` | ✅ PASS |
| `periodo` formato | `YYYY-MM` | `2026-06` | ✅ PASS |
| `dataRegistro` formato | ISO 8601 | `2026-06-10T23:48:52.799326Z` | ✅ PASS |
| `criadoEm` formato | ISO 8601 | `2026-06-10T23:48:52.799326Z` | ✅ PASS |
| `atualizadoEm` formato | ISO 8601 | `2026-06-10T23:48:52.799326Z` | ✅ PASS |
| `licenca.usuarioMusica` campos | `id`, `razaoSocial`, `cnpj` | `id`, `razaoSocial`, `cnpjFormatado` | ❌ **FAIL** |

**Resultado:** ❌ **FAIL**

**Expected:** `licenca.usuarioMusica` deve conter o campo `cnpj` (string CNPJ não formatado ou formatado, conforme contrato de API).  
**Actual:** `licenca.usuarioMusica` retorna `cnpjFormatado` em vez de `cnpj`. O campo `cnpj` está ausente.

**Impacto:** Baixo para a UI (a interface não usa o campo `cnpj` diretamente no detalhe do pagamento), mas **médio para integrações** que consumem a API e esperam o campo `cnpj` conforme especificação do contrato (`api-contract.md` / `techspec.md`).

**Recomendação:** Revisar o `PagamentoResponse` (ou DTO de usuário de música) para garantir que o campo exposto seja `cnpj` (ou ambos `cnpj` e `cnpjFormatado` se necessário) e esteja alinhado com o contrato de API.

---

## Logs de Requisição

### CT-01
```bash
curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer <JWT>" \
  https://mcad-bff.tasso.dev.br/api/arrecadacao/v1/pagamentos/fa24bdf6-6832-4668-a691-1ee3e298b14d
```
**Status:** `200`  
**Response:** `ct01_response.json`

### CT-02
```bash
curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer <JWT>" \
  https://mcad-bff.tasso.dev.br/api/arrecadacao/v1/pagamentos/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```
**Status:** `404`  
**Response:** `ct02_response.json`

---

## Conclusão

- **CT-01:** ✅ PASS
- **CT-02:** ✅ PASS
- **CT-03:** ✅ PASS
- **CT-04:** ❌ FAIL (campo `cnpj` vs `cnpjFormatado`)

**Status Final:** **FAIL**

A funcionalidade de visualização de detalhes do pagamento opera corretamente em termos de negócio (dados corretos, UI funcional, erros 404 tratados). A única falha é uma **discrepância no contrato de API** (`cnpjFormatado` ao invés de `cnpj`) que deve ser corrigida para alinhamento com o PRD/techspec.

---

**Report gerado por:** QA Task Runner  
**Data:** 2026-06-10T23:55:00Z
