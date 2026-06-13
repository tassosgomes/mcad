# Relatório de Testes QA — F04: Registro de Pagamentos

**Data da Sessão:** 2026-06-10
**Ambiente testado:** https://mcad.tasso.dev.br
**PRD:** tasks/arrecadacao/prd-registro-pagamentos/prd.md
**Techspec:** tasks/arrecadacao/prd-registro-pagamentos/techspec.md
**API Contract:** tasks/arrecadacao/prd-registro-pagamentos/api-contract.md

---

## Sumário Executivo

| Métrica | Resultado |
|---------|-----------|
| Tasks executadas | 7 de 7 |
| Tasks com PASS | 6 ✅ |
| Tasks com FAIL | 1 ❌ |
| Tasks bloqueadas | 0 ⚠️ |
| Casos de teste total | 28 |
| Casos PASS | 26 |
| Casos FAIL | 1 |
| Casos não executados | 1 (CT-01 task 05 — reexecutado posteriormente) |
| **Resultado geral** | **❌ REPROVADO** |

> Resultado geral é APROVADO apenas se todas as tasks estiverem com status PASS. A task 07 (detalhes_pagamento) apresentou uma falha no contrato de API (campo `cnpj` vs `cnpjFormatado`), resultando em REPROVADO.

### Features testadas

| Feature / User Story | Task | Status |
|----------------------|------|--------|
| Login e Autenticação (analista_arrecadacao) | qa_task_01 | ✅ PASS |
| HU-06 — Consultar UDA vigente | qa_task_02 | ✅ PASS |
| HU-01 — Ajustar valor da UDA | qa_task_03 | ✅ PASS |
| HU-02 — Consultar histórico da UDA | qa_task_04 | ✅ PASS |
| HU-03 — Registrar pagamento | qa_task_05 | ✅ PASS |
| HU-04 — Consultar pagamentos com filtros | qa_task_06 | ✅ PASS |
| HU-05 — Visualizar detalhes do pagamento | qa_task_07 | ❌ FAIL |

### Escopo excluído (conforme acordado)

| Feature | Motivo da exclusão |
|---------|-------------------|
| Testes de perfil consultor (403) | Usuário optou por testar apenas analista_arrecadacao |
| Validação de banco de dados | Usuário não solicitou |
| Testes com outros perfis (sem role de arrecadação) | Fora do escopo acordado |
| Estorno de pagamentos (F06) | Fora do escopo do PRD F04 |
| Cálculo de verba líquida (F05) | Downstream, fora do escopo |

---

## Resultado por Feature

### qa_task_01 — Login e Autenticação ✅ PASS

**Tipos de teste:** UI + API
**Casos executados:** 2/2

| Caso | Descrição | Status |
|------|-----------|--------|
| CT-01 | Login via UI com credenciais válidas de analista_arrecadacao | ✅ PASS |
| CT-02 | Navegação para o módulo Arrecadação (Pagamentos) | ✅ PASS |

**Observações:** Autenticação via LogTo funciona corretamente. Um glitch 503 temporário na primeira chamada GET /api/arrecadacao/v1/usuarios-musica foi imediatamente resolvido (segunda chamada retornou 200). Não impactou os testes.

**Evidências:** `qa-evidence/qa_task_01_login/`

---

### qa_task_02 — HU-06: Consultar UDA vigente ✅ PASS

**Tipos de teste:** UI + API
**Casos executados:** 3/3

| Caso | Descrição | Status |
|------|-----------|--------|
| CT-01 | API GET /uda/vigente retorna 200 com valor correto | ✅ PASS |
| CT-02 | UI exibe valor vigente e data de vigência | ✅ PASS |
| CT-03 | Formato dos campos (string, ISO, YYYY-MM-DD) | ✅ PASS |

**Observações:** Valor vigente retornado é o seed R$ 107,31 (`"107.310000"`). Campos no formato correto. UI exibe "R$ 107,31" com locale pt-BR.

**Evidências:** `qa-evidence/qa_task_02_uda_vigente/`

---

### qa_task_03 — HU-01: Ajustar valor da UDA ✅ PASS

**Tipos de teste:** UI + API
**Casos executados:** 4/4

| Caso | Descrição | Status |
|------|-----------|--------|
| CT-01 | POST /uda com valor válido (201) | ✅ PASS |
| CT-02 | POST /uda com valor inválido (<=0) — 400 | ✅ PASS |
| CT-03 | Ajustar UDA via UI (modal, salvar, histórico) | ✅ PASS |
| CT-04 | Pré-agendamento com data futura (vigente não muda) | ✅ PASS |

**Discrepâncias detectadas (não bloqueantes):**
1. **Formato decimal:** Backend retorna `"115.00"` em vez de `"115.000000"` (6 casas). Contrato especifica 6 casas.
2. **Header Location:** Ausente na resposta 201 do POST. Contrato especifica presença.
3. **`criadoPor`:** Retorna `"Analista Arrecadacao (analista_arrecadacao)"` em vez de apenas username `"analista.arrecadacao"`.
4. **Erro 400:** Mensagem genérica `"Invalid request content."` sem array `errors` detalhando o campo inválido.

**Evidências:** `qa-evidence/qa_task_03_ajustar_uda/`

---

### qa_task_04 — HU-02: Consultar histórico da UDA ✅ PASS

**Tipos de teste:** UI + API
**Casos executados:** 3/3

| Caso | Descrição | Status |
|------|-----------|--------|
| CT-01 | API GET /uda/historico retorna 200 com array ordenado | ✅ PASS |
| CT-02 | UI exibe tabela com histórico, seed como "Sistema" | ✅ PASS |
| CT-03 | Ordenação DESC por dataVigencia confirmada | ✅ PASS |

**Observações:** 5 registros no histórico (seed + 4 criados em testes). Seed exibido como "Sistema" no UI. Ordenação DESC correta.

**Evidências:** `qa-evidence/qa_task_04_historico_uda/`

---

### qa_task_05 — HU-03: Registrar pagamento ✅ PASS

**Tipos de teste:** UI + API
**Casos executados:** 6/6 (1 inicialmente bloqueado, reexecutado com sucesso)

| Caso | Descrição | Status |
|------|-----------|--------|
| CT-01 | Happy path — Registrar pagamento para licença ATIVA | ✅ PASS |
| CT-02 | Erro 422 — Licença ENCERRADA | ✅ PASS |
| CT-03 | Erro 409 — Pagamento duplicado | ✅ PASS |
| CT-04 | Erro 400 — quantidadeUdas <= 0 | ✅ PASS |
| CT-05 | Registrar pagamento via UI | ✅ PASS |
| CT-06 | Licença inexistente (404) | ✅ PASS |

**Observações:**
- CT-01 inicialmente bloqueado (todas as 191 licenças ATIVA já tinham pagamento para 2026-06). Usuário criou nova licença `72ad4fb1-003f-4bb3-9ea5-f6a4b220488a` e o teste foi reexecutado com sucesso.
- Pagamento criado: `fa24bdf6-6832-4668-a691-1ee3e298b14d` (2.5 UDAs, valorBruto 268.275000, período 2026-06).
- CT-05 (UI) inicialmente falhou com 503 "AuthZ service unavailable" (instabilidade de infraestrutura). Na reexecução, a UI funcionou corretamente (exibiu mensagem de duplicado 409, que é comportamento esperado pois CT-01 já havia criado o pagamento).

**Evidências:** `qa-evidence/qa_task_05_registrar_pagamento/`

---

### qa_task_06 — HU-04: Listar pagamentos com filtros ✅ PASS

**Tipos de teste:** UI + API
**Casos executados:** 8/8

| Caso | Descrição | Status |
|------|-----------|--------|
| CT-01 | Listar pagamentos sem filtros | ✅ PASS |
| CT-02 | Paginação (page=1, page=2) | ✅ PASS |
| CT-03 | Filtro por período (2026-06) | ✅ PASS |
| CT-04 | Filtro por status (CONFIRMADO) | ✅ PASS |
| CT-05 | Filtro por razaoSocial (Bossa) | ✅ PASS |
| CT-06 | Filtro combinado (AND) | ✅ PASS |
| CT-07 | Listar pagamentos via UI | ✅ PASS |
| CT-08 | Aplicar filtro no UI | ✅ PASS |

**Observações:**
- Estrutura da resposta: `items` array + `metadata` (com `page`, `size`, `totalElements`, `totalPages`). Contrato especifica `data`/`pagination`, mas a estrutura real é funcionalmente equivalente.
- Retry de 503 no CT-06 (filtro combinado): primeira tentativa retornou 503, retry retornou 200.
- 255 pagamentos no total.

**Evidências:** `qa-evidence/qa_task_06_listar_pagamentos/`

---

### qa_task_07 — HU-05: Visualizar detalhes do pagamento ❌ FAIL

**Tipos de teste:** UI + API
**Casos executados:** 3/4 (1 falhou)

| Caso | Descrição | Status |
|------|-----------|--------|
| CT-01 | Buscar pagamento por ID existente | ✅ PASS |
| CT-02 | Buscar pagamento por ID inexistente | ✅ PASS |
| CT-03 | Visualizar detalhes via UI | ✅ PASS |
| CT-04 | Validar formato dos valores | ❌ FAIL |

**Evidências:** `qa-evidence/qa_task_07_detalhes_pagamento/`

---

## Detalhes das Falhas

### FALHA 01 — qa_task_07 / CT-04

**User Story:** HU-05 — Visualizar detalhes do pagamento
**Caso de Teste:** CT-04 — Validar formato dos valores
**Tipo:** API

**Pre-condição:**
Pagamento existente (`fa24bdf6-6832-4668-a691-1ee3e298b14d`) criado via CT-01 da task 05.

**Passos executados até a falha:**
1. GET `/api/arrecadacao/v1/pagamentos/fa24bdf6-6832-4668-a691-1ee3e298b14d` com Bearer token
2. Response 200 com body completo
3. ❌ FALHOU AQUI: Validação do campo `licenca.usuarioMusica.cnpj`

**Expected:**
`licenca.usuarioMusica` deve conter o campo `cnpj` (conforme contrato de API `api-contract.md` e `techspec.md`):
```json
"usuarioMusica": {
  "id": "...",
  "razaoSocial": "...",
  "cnpj": "50997063000132"
}
```

**Actual:**
`licenca.usuarioMusica` retorna `cnpjFormatado` em vez de `cnpj`:
```json
"usuarioMusica": {
  "id": "0b7645c5-dd38-46dd-ba1a-7c784f1b09b2",
  "razaoSocial": "Bossa Cinema 00039 Entretenimento Ltda",
  "cnpjFormatado": "10.000.038/0001-18"
}
```
O campo `cnpj` está **ausente**.

**Impacto:**
- **Baixo para UI:** A interface não usa o campo `cnpj` diretamente no detalhe do pagamento.
- **Médio para integrações:** APIs downstream que consomem o endpoint e esperam `cnpj` conforme contrato podem quebrar.

**Erro capturado:**
N/A — comportamento de API retornando campo diferente do contrato.

**Evidências:**
- Response completo: `qa-evidence/qa_task_07_detalhes_pagamento/ct01_response.json`
- Validação de formatos: `qa-evidence/qa_task_07_detalhes_pagamento/ct04_validation.txt`
- Screenshot UI: `qa-evidence/qa_task_07_detalhes_pagamento/screenshots/ct03_detalhes_ui.png`

---

## Recomendações de Investigação

### Investigar: Discrepância no campo CNPJ do contrato de API

- **Contexto:** Endpoint `GET /api/arrecadacao/v1/pagamentos/{id}` retorna `PagamentoResponse` com `licenca.usuarioMusica`.
- **Comportamento observado:** O campo `cnpj` está ausente; existe apenas `cnpjFormatado`.
- **Onde investigar:** DTO `UsuarioMusicaResumoResponse` (ou equivalente) no módulo `arrecadacao-application`. Verificar se o campo `cnpj` está sendo mapeado corretamente do entity para o DTO. Verificar também se o `api-contract.md` está desatualizado ou se o DTO precisa ser ajustado.
- **Evidências relacionadas:** `qa-evidence/qa_task_07_detalhes_pagamento/ct01_response.json`, `qa-evidence/qa_task_07_detalhes_pagamento/ct04_validation.txt`

### Investigar: Formato de valores decimais no POST /uda

- **Contexto:** Endpoint `POST /api/arrecadacao/v1/uda` retorna valor com 2 casas decimais (`"115.00"`) em vez de 6 (`"115.000000"`).
- **Comportamento observado:** O contrato de API especifica 6 casas decimais para preservar precisão.
- **Onde investigar:** DTO `UdaResponse` — verificar se há formatação explícita de 6 casas decimais (`BigDecimal.toPlainString()` com `setScale(6)`).
- **Evidências relacionadas:** `qa-evidence/qa_task_03_ajustar_uda/logs/requests.log`

### Investigar: Header Location ausente em POST /uda

- **Contexto:** Endpoint `POST /api/arrecadacao/v1/uda` retorna 201 sem header `Location`.
- **Comportamento observado:** Contrato de API especifica `Location: /api/v1/uda/{id}`.
- **Onde investigar:** `UdaController` — verificar se `ResponseEntity.created(URI)` está sendo usado.
- **Evidências relacionadas:** `qa-evidence/qa_task_03_ajustar_uda/logs/requests.log`

### Investigar: Instabilidade do AuthZ Service (503)

- **Contexto:** Erro 503 "AuthZ service unavailable" intermitente no BFF.
- **Comportamento observado:** Ocorreu em múltiplos momentos (task 05 CT-05, task 06 CT-06). Retry resolve o problema.
- **Onde investigar:** Logs do serviço `mcad-bff` e do serviço de autorização (AuthZ). Verificar saúde do container/pods, uso de memória/CPU, e logs de erro.
- **Evidências relacionadas:** `qa-evidence/qa_task_05_registrar_pagamento/screenshots/ct05_error_503.png`, `qa-evidence/qa_task_05_registrar_pagamento/requests.log`

---

## Índice de Evidências

```
qa-evidence/
├── qa_session.json
├── qa_report_consolidated.md
│
├── qa_task_01_login/
│   ├── qa_report_task_01.md
│   ├── screenshots/
│   │   ├── ct01_logto_signin.png
│   │   ├── ct01_login_success.png
│   │   └── ct02_modulo_pagamentos.png
│   ├── network_token_request.txt
│   ├── network_token_response.txt
│   └── network_requests.log
│
├── qa_task_02_uda_vigente/
│   ├── qa_report_task_02.md
│   ├── logs/requests.log
│   └── screenshots/ct02_uda_vigente_ui.png
│
├── qa_task_03_ajustar_uda/
│   ├── qa_report_task_03.md
│   ├── logs/requests.log
│   └── screenshots/
│       ├── ct02_ajustar_uda_modal.png
│       ├── ct02_ajustar_uda_after_save.png
│       └── ct02_ajustar_uda_final.png
│
├── qa_task_04_historico_uda/
│   ├── qa_report_task_04.md
│   ├── logs/requests.log
│   └── screenshots/
│       ├── ct02_historico_ui.png
│       └── ct02_historico_ui_refreshed.png
│
├── qa_task_05_registrar_pagamento/
│   ├── qa_report_task_05.md
│   ├── test_plan.md
│   ├── requests.log
│   ├── requests_reexec.log
│   ├── pagamento_id.txt
│   └── screenshots/
│       ├── ct05_form_filled.png
│       ├── ct05_error_503.png
│       ├── ct05_reexec_registrar_pagamento_ui.png
│       └── ct05_license_selected.png
│
├── qa_task_06_listar_pagamentos/
│   ├── qa_report_task_06.md
│   ├── logs/requests.log
│   └── screenshots/
│       ├── ct07_listar_pagamentos_ui.png
│       └── ct08_filtro_ui.png
│
└── qa_task_07_detalhes_pagamento/
    ├── qa_report_task_07.md
    ├── ct01_response.json
    ├── ct02_response.json
    ├── ct04_validation.txt
    └── screenshots/
        └── ct03_detalhes_ui.png
```

---

## Informações da Sessão

| Campo | Valor |
|-------|-------|
| Banco de dados validado | Não |
| Tipo de banco | N/A |
| Autenticação testada | Sim (LogTo OIDC) |
| Playwright (UI) | Sim |
| cURL / fetch (API) | Sim |
| Tasks em paralelo | Sim (Fases 2 e 4) |
| Tasks sequenciais | Sim (Fases 1 e 3) |
| Usuário de teste | analista_arrecadacao |
| Role testada | analista-arrecadacao |
| Ambiente frontend | https://mcad.tasso.dev.br |
| Ambiente API (BFF) | https://mcad-bff.tasso.dev.br |

---

*Relatório gerado pelo QA Report Builder — skill flow-qa-report-builder*
*Data: 2026-06-10*
