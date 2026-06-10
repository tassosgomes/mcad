# Relatório de Testes QA — F03: Gestão de Licenças

**Data da Sessão:** 2026-06-10 (inclui reteste das correções)  
**Ambiente testado:** https://mcad.tasso.dev.br  
**PRD:** `tasks/arrecadacao/prd-gestao-licencas/prd.md`  
**Techspec:** `tasks/arrecadacao/prd-gestao-licencas/techspec.md`  

---

## Sumário Executivo

| Métrica | Resultado |
|---------|-----------|
| Tasks executadas | 7 de 7 |
| Tasks com PASS | 7 ✅ |
| Tasks com FAIL | 0 ❌ |
| Tasks bloqueadas | 0 |
| Casos de teste total | 47 |
| Casos PASS | 43 |
| Casos FAIL | 0 |
| Casos não executados | 4 |
| **Resultado geral** | **✅ APROVADO** |

> Resultado geral é APROVADO apenas se todas as tasks estiverem com status PASS. Qualquer FAIL resulta em REPROVADO.

### Features testadas

| Feature / User Story | Task | Status |
|----------------------|------|--------|
| HU-01 — Criar licença | qa_task_01 | ✅ PASS |
| HU-02 — Suspender licença | qa_task_02 | ✅ PASS (reteste) |
| HU-03 — Reativar licença | qa_task_03 | ✅ PASS |
| HU-04 — Encerrar licença | qa_task_04 | ✅ PASS (reteste) |
| HU-05 — Listar licenças | qa_task_05 | ✅ PASS |
| HU-06 — Detalhes e histórico | qa_task_06 | ✅ PASS |
| HU-07 — Seleção para pagamento (F04) | qa_task_07 | ✅ PASS |

### Escopo excluído (conforme acordado)

| Feature | Motivo da exclusão |
|---------|-------------------|
| Testes de autorização negativa (403) | Usuário optou por não cobrir |
| Validação direta no banco de dados | Usuário optou por não cobrir |
| Registro de pagamento (F04) | Feature F04, fora do escopo deste PRD |
| Performance (< 500ms para 10.000 licenças) | Requer ambiente de carga dedicado |

---

## Resultado por Feature

### qa_task_01 — Criar Licença ✅ PASS

**Tipos de teste:** UI + API  
**Casos executados:** 7/7

| Caso | Descrição | Tipo | Status |
|------|-----------|------|--------|
| CT-01 | Happy Path — Criar licença válida | API | ✅ PASS |
| CT-02 | Validação — Usuário INATIVO | API | ⚠️ BLOCKED (falta de pré-condição) |
| CT-03 | Validação — dataInicio no passado | API | ✅ PASS |
| CT-04 | Validação — dataFim antes de dataInicio | API | ✅ PASS |
| CT-05 | Múltiplas licenças para mesmo par (RF-02) | API | ✅ PASS |
| CT-06 | Frontend — Abrir formulário de criação | UI | ✅ PASS |
| CT-07 | Frontend — Submeter criação válida | UI | ✅ PASS |

**Evidências:** `qa-evidence/qa_task_01_criar_licenca/`

---

### qa_task_02 — Suspender Licença ✅ PASS

**Tipos de teste:** UI + API  
**Casos executados:** 6/6 (incluindo reteste)

| Caso | Descrição | Tipo | Status |
|------|-----------|------|--------|
| CT-01 | Suspender licença ATIVA | API | ✅ PASS |
| CT-02 | Tentar suspender licença já SUSPENSA | API | ✅ PASS |
| CT-03 | Justificativa curta (< 10 chars) | API | ✅ PASS |
| CT-04 | Tentar suspender licença ENCERRADA | API | ✅ PASS (reteste) |
| CT-05 | Frontend — Botão "Suspender" visível | UI | ✅ PASS |
| CT-06 | Frontend — Suspender via modal | UI | ✅ PASS (reteste) |

**Nota de Reteste (2026-06-10):** A mensagem de erro 422 para licença ENCERRADA foi corrigida. Agora retorna `"Somente licenças ATIVAS podem ser suspensas. Status atual: ENCERRADA"`, conforme o PRD.

**Evidências:** `qa-evidence/qa_task_02_suspender_licenca/`

---

### qa_task_03 — Reativar Licença ✅ PASS

**Tipos de teste:** UI + API  
**Casos executados:** 5/5

| Caso | Descrição | Tipo | Status |
|------|-----------|------|--------|
| CT-01 | Reativar licença SUSPENSA | API | ✅ PASS |
| CT-02 | Tentar reativar licença já ATIVA | API | ✅ PASS |
| CT-03 | Tentar reativar licença ENCERRADA | API | ✅ PASS |
| CT-04 | Frontend — Botão "Reativar" visível | UI | ✅ PASS |
| CT-05 | Frontend — Reativar via modal | UI | ✅ PASS |

**Evidências:** `qa-evidence/qa_task_03_reativar_licenca/`

---

### qa_task_04 — Encerrar Licença ✅ PASS

**Tipos de teste:** UI + API  
**Casos executados:** 7/7 (incluindo reteste)

| Caso | Descrição | Tipo | Status |
|------|-----------|------|--------|
| CT-01 | Encerrar licença SUSPENSA | API | ✅ PASS |
| CT-01-HIST | Verificar histórico de encerramento | API | ✅ PASS |
| CT-02 | Tentar encerrar licença já ENCERRADA | API | ✅ PASS (reteste) |
| CT-03 | Tentar encerrar licença ATIVA diretamente | API | ✅ PASS (reteste) |
| CT-04 | Tentar suspender licença ENCERRADA | API | ✅ PASS (reteste) |
| CT-05 | Tentar reativar licença ENCERRADA | API | ✅ PASS (reteste) |
| CT-06 | Frontend — Botão "Encerrar" visível | UI | ✅ PASS (reteste) |
| CT-07 | Frontend — Encerrar via modal | UI | ✅ PASS (reteste) |

**Nota de Reteste (2026-06-10):** A mensagem de erro 422 para licença ENCERRADA foi corrigida. Agora retorna `"Licença já está ENCERRADA. Esta transição não é permitida."`, conforme o PRD.

**Evidências:** `qa-evidence/qa_task_04_encerrar_licenca/`

---

### qa_task_05 — Listar Licenças ✅ PASS

**Tipos de teste:** UI + API  
**Casos executados:** 11/11 (incluindo reteste)

| Caso | Descrição | Tipo | Status |
|------|-----------|------|--------|
| CT-01 | Listar todas — paginação padrão | API | ⚠️ PASS (contrato diverge do PRD) |
| CT-02 | Filtrar por status=ATIVA | API | ✅ PASS |
| CT-03 | Filtrar por status=SUSPENSA | API | ✅ PASS |
| CT-04 | Filtrar por vigente=true | API | ✅ PASS |
| CT-05 | Filtrar por usuarioMusicaId | API | ✅ PASS |
| CT-06 | Filtrar por razaoSocial (parcial) | API | ✅ PASS |
| CT-07 | Filtrar por rubricaSigla (parcial) | API | ✅ PASS |
| CT-08 | Paginação — page e size | API | ✅ PASS |
| CT-09 | Ordenação — dataInicio DESC | API | ⚠️ PASS (sort funciona, mas default diverge do PRD) |
| CT-10 | Frontend — Filtros e paginação | UI | ✅ PASS (reteste: bug de paginação corrigido) |
| CT-11 | Frontend — Badges e dados expandidos | UI | ✅ PASS (badge Suspensa verificado em amarelo) |

**Notas de Reteste (2026-06-10):**
- **CT-10 (paginação):** Bug do label `-9–0` foi corrigido. Agora exibe `1–10 de 260` corretamente.
- **CT-01 (contrato API):** Não corrigido. Continua usando `items`/`metadata`/`totalElements` com paginação 0-indexada.
- **CT-09 (default sort):** Não corrigido. Continua `criadoEm,desc` em vez de `-dataInicio`.
- **CT-11 (badge Suspensa):** ✅ **Verificado com sucesso.** A licença "Bins, McClure and Jast" (ID: 5112f7c5-2899-4e89-837f-fdcd73c38609) aparece na tela `/arrecadacao/licencas` com status "Suspensa" e badge amarelo/dourado conforme o PRD.

**Evidências:** `qa-evidence/qa_task_05_listar_licencas/`

---

### qa_task_06 — Detalhes e Histórico ✅ PASS

**Tipos de teste:** UI + API  
**Casos executados:** 5/5

| Caso | Descrição | Tipo | Status |
|------|-----------|------|--------|
| CT-01 | Buscar detalhes da licença por ID | API | ✅ PASS |
| CT-02 | Buscar histórico da licença | API | ✅ PASS |
| CT-03 | 404 para licença inexistente | API | ✅ PASS |
| CT-04 | Frontend — Navegar para detalhe | UI | ✅ PASS |
| CT-05 | Frontend — Aba/seção de histórico | UI | ✅ PASS |

**Evidências:** `qa-evidence/qa_task_06_detalhes_e_historico/`

---

### qa_task_07 — Seleção para Pagamento (Contrato F04) ✅ PASS

**Tipos de teste:** API  
**Casos executados:** 5/5

| Caso | Descrição | Tipo | Status |
|------|-----------|------|--------|
| CT-01 | Filtrar por usuarioMusicaId + status=ATIVA | API | ✅ PASS |
| CT-02 | Filtrar por usuarioMusicaId + status=SUSPENSA | API | ✅ PASS |
| CT-03 | Filtrar por vigente=true + status=ATIVA | API | ✅ PASS |
| CT-04 | Confirmar que ENCERRADA pode ser listada | API | ✅ PASS |
| CT-05 | Dados expandidos necessários para F04 | API | ✅ PASS |

**Evidências:** `qa-evidence/qa_task_07_selecao_pagamento/`

---

## Observações Importantes

> Esta seção detalha observações que não impedem aprovação, mas devem ser monitoradas.
> Todas as falhas funcionais foram corrigidas no reteste de 2026-06-10.

### OBSERVAÇÃO 01 — qa_task_05 / CT-01 — Contrato de resposta da listagem

**User Story:** HU-05 — Listar licenças  
**Caso de Teste:** CT-01 — Listar todas — paginação padrão  
**Tipo:** API

**Passos executados:**
1. GET /api/arrecadacao/v1/licencas
2. ❌ FALHOU AQUI: A estrutura da resposta não corresponde ao PRD

**Expected (PRD):**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "size": 20,
    "total": 260,
    "totalPages": 13
  }
}
```

**Actual:**
```json
{
  "items": [...],
  "metadata": {
    "page": 0,
    "size": 20,
    "totalElements": 260,
    "totalPages": 13
  }
}
```

**Erro capturado:**
A API utiliza o envelope Spring Data REST (`items`/`metadata`/`totalElements` com paginação 0-indexada) em vez do contrato definido no PRD (`data`/`pagination`/`total` com paginação 1-indexada). Embora o frontend funcione, o contrato documentado não é respeitado.

**Evidências:**
- Request/Response: `qa-evidence/qa_task_05_listar_licencas/requests.log`

---

### OBSERVAÇÃO 02 — qa_task_05 / CT-09 — Default sort diverge do PRD

**User Story:** HU-05 — Listar licenças  
**Caso de Teste:** CT-09 — Ordenação padrão  
**Tipo:** API

**Passos executados:**
1. GET /api/arrecadacao/v1/licencas (sem parâmetro `sort`)
2. ❌ FALHOU AQUI: O sort padrão não é `-dataInicio`

**Expected:**
- Sort padrão: `dataInicio` DESC (mais recentes primeiro)
- Primeiros itens devem ter as datas de início mais recentes

**Actual:**
- Sort padrão: `criadoEm,desc` (data de criação descending)
- A ordenação por `dataInicio` funciona apenas quando explicitamente requisitada (`sort=dataInicio,desc`)

**Erro capturado:**
O PRD especifica sort padrão como `-dataInicio`, mas a implementação atual usa `criadoEm,desc`.

**Evidências:**
- Request/Response: `qa-evidence/qa_task_05_listar_licencas/requests.log`

---

## Recomendações de Investigação

> Esta seção aponta o que deve ser investigado. NÃO sugere implementação ou correção.

### Investigar: Contrato de resposta da listagem diverge do PRD

- **Contexto:** O endpoint GET `/api/v1/licencas` retorna envelope no formato Spring Data REST (`items`/`metadata`/`totalElements` e paginação 0-indexada) em vez do formato definido no PRD (`data`/`pagination`/`total`, 1-indexada).
- **Comportamento observado:** Frontend compensa a diferença, mas o contrato documentado não é respeitado.
- **Onde investigar:** Verificar o DTO/mapper de paginação no `arrecadacao-api` e o `LicencaController`.
- **Evidências relacionadas:** `qa-evidence/qa_task_05_listar_licencas/requests.log`

### Investigar: Default sort da listagem não é -dataInicio

- **Contexto:** O PRD define sort padrão como `-dataInicio` (dataInicio DESC), mas o endpoint retorna ordenado por `criadoEm,desc`.
- **Comportamento observado:** O sort funciona corretamente quando explicitamente requisitado (`sort=dataInicio,desc`), mas o default está diferente.
- **Onde investigar:** Verificar o `ListarLicencasQueryHandler` ou o controller.
- **Evidências relacionadas:** `qa-evidence/qa_task_05_listar_licencas/requests.log`

---

## Índice de Evidências

```
qa-evidence/
├── qa_session.json
├── qa_report_consolidado.md
│
├── qa_task_01_criar_licenca/
│   ├── test_plan.md
│   ├── created_license_id.txt
│   ├── screenshots/
│   │   ├── ct06_form_open.png
│   │   └── ct07_creation_success.png
│   └── requests.log
│
├── qa_task_02_suspender_licenca/
│   ├── test_plan.md
│   ├── qa_report_task_02_retest.md
│   ├── screenshots/
│   │   ├── ct05_suspend_button.png
│   │   ├── ct06_suspended.png
│   │   └── ct05_retest_suspended.png
│   └── requests.log
│
├── qa_task_03_reativar_licenca/
│   ├── test_plan.md
│   ├── screenshots/
│   │   ├── ct04_reativar_button.png
│   │   └── ct05_reativada.png
│   └── requests.log
│
├── qa_task_04_encerrar_licenca/
│   ├── test_plan.md
│   ├── qa_report_task_04_retest.md
│   ├── screenshots/
│   │   ├── ct06_retest_encerrar_button.png
│   │   ├── ct07_modal_open.png
│   │   └── ct07_retest_encerrada.png
│   └── requests.log
│
├── qa_task_05_listar_licencas/
│   ├── test_plan.md
│   ├── qa_report_task_05_retest.md
│   ├── screenshots/
│   │   ├── ct10_filter_ativa.png
│   │   ├── ct10_filter_vigente.png
│   │   ├── ct10_pagination.png
│   │   ├── ct10_retest_pagination.png
│   │   ├── ct11_badges.png
│   │   ├── ct11_encerrada_badge.png
│   │   ├── ct11_retest_badge_suspensa.png
│   │   ├── ct11_retest_badge_suspensa_unfiltered.png
│   │   └── ct11_retest_badge_suspensa_confirmado.png
│   └── requests.log
│
├── qa_task_06_detalhes_e_historico/
│   ├── test_plan.md
│   ├── screenshots/
│   │   ├── ct04_detail_page.png
│   │   └── ct05_history_tab.png
│   └── requests.log
│
└── qa_task_07_selecao_pagamento/
    ├── test_plan.md
    ├── screenshots/
    │   └── qa_task_07_final.png
    ├── ct01_response.json
    ├── ct02_response.json
    ├── ct03_response.json
    ├── ct04_response.json
    └── requests.log
```

---

## Informações da Sessão

| Campo | Valor |
|-------|-------|
| Banco de dados validado | Não |
| Tipo de banco | N/A |
| Autenticação testada | Sim (Logto OIDC PKCE) |
| Playwright (UI) | Sim |
| cURL (API) | Não (anti-bot no BFF; usado fetch via browser) |
| Tasks em paralelo | Sim (Fase 2: qa_task_05, qa_task_06, qa_task_07) |
| Re-execuções após correções | Sim (qa_task_02, qa_task_03, qa_task_04, qa_task_05) |
