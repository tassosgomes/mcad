# Relatorio de Testes QA - PRD AuthZ Fonte Unica de Assignments

**Data da Sessao:** 2026-05-30T20:34:19Z  
**Ambiente testado:** https://mcad.tasso.dev.br  
**PRD:** `tasks/plataforma/prd-authz-fonte-unica-assignments/prd.md`  
**Techspec:** `tasks/plataforma/prd-authz-fonte-unica-assignments/techspec.md`  
**Credenciais:** `.env_qa` lido localmente; senhas, tokens, Authorization headers e codigos OAuth nao foram registrados.

---

## Sumario Executivo

| Metrica | Resultado |
|---------|-----------|
| Tasks planejadas | 4 |
| Tasks executadas | 3 |
| Tasks com PASS | 1 |
| Tasks com FAIL | 2 |
| Tasks bloqueadas | 1 |
| Resultado geral | **REPROVADO** |

O deploy esta funcional para login e para resolucao de permissoes efetivas via BFF, mas o cutover ainda nao atende todos os gates:

- Todos os access tokens observados ainda contem claim top-level `roles`.
- O usuario `gestor-acessos.dev` autentica, mas a rota `/autorizacao/atribuicoes` exibe acesso negado.
- A validacao de concessao/revogacao dinamica nao foi executada porque depende do fluxo administrativo de Atribuicoes, que falhou antes.

---

## Features Testadas

| Feature / User Story | Task | Status |
|----------------------|------|--------|
| Login OIDC e token sem roles | `qa_task_01_login_tokens_env_qa` | FAIL |
| Matriz de permissoes efetivas via `/api/me` e `/api/me/permissions` | `qa_task_02_permissions_matrix_env_qa` | PASS |
| Operacoes read-only de Atribuicoes via BFF/UI | `qa_task_03_acessos_operations` | FAIL |
| Concessao e revogacao dinamica sem relogin | `qa_task_04_dynamic_assignment_revocation` | BLOCKED |

---

## Resultado por Feature

### qa_task_01 - Login OIDC e tokens sem roles - FAIL

**Tipos de teste:** UI / OIDC  
**Casos executados:** 3/3  
**Relatorio individual:** `qa_task_01_login_tokens/qa_report_task_01.md`

| Caso | Descricao | Status |
|------|-----------|--------|
| CT-01 | Login OIDC pela UI para cada usuario `.env_qa` | FAIL |
| CT-02 | Access token sem claims `role`/`roles` e sem escopo `roles` | FAIL |
| CT-03 | Evidencias sanitizadas por usuario | PASS |

**Resumo observado:**

- Redirect para Logto: PASS para todos os usuarios testados.
- Login retornou ao app: PASS para todos os usuarios testados.
- Pagina autenticada alcancada: PASS para todos os usuarios testados.
- Access token observado e decodificado como JWT: PASS para todos os usuarios testados.
- Claim top-level `role` ausente: PASS para todos os usuarios testados.
- Scope nao contem `roles`: PASS para todos os usuarios testados.
- Claim top-level `roles` ausente: FAIL para todos os usuarios testados.

**Evidencias:** `qa_task_01_login_tokens/`

---

### qa_task_02 - Matriz de permissoes efetivas - PASS

**Tipos de teste:** UI + API  
**Casos executados:** 10/10  
**Relatorio individual:** `qa_task_02_permissions_matrix/qa_report_task_02.md`

| Usuario | `/api/me` | `/api/me/permissions` | Permissoes | Authz Version | Status |
|---|---:|---:|---:|---:|---|
| admin_authz | 200 | 200 | 15 | 6 | PASS |
| admin_authz2 | 200 | 200 | 15 | 4 | PASS |
| analista_distribuicao | 200 | 200 | 102 | 7 | PASS |
| consultor_acessosdev | 200 | 200 | 5 | 2 | PASS |
| consultor_dev | 200 | 200 | 40 | 5 | PASS |
| gerente_dev | 200 | 200 | 16 | 2 | PASS |
| gestor_acessosdev | 200 | 200 | 7 | 2 | PASS |
| operador_dev | 200 | 200 | 9 | 2 | PASS |
| tsgomes | 200 | 200 | 47 | 5 | PASS |
| sem_papel | 200 | 200 | 0 | 1 | PASS |

**Resumo observado:**

- Todos os usuarios autenticaram via UI Logto.
- `/api/me` e `/api/me/permissions` retornaram 200 para todos os usuarios.
- `sem_papel` retornou comportamento deny-safe: 200 com 0 permissoes efetivas.
- Evidencias textuais foram verificadas contra padroes de token JWT/Bearer sem vazamento.

**Evidencias:** `qa_task_02_permissions_matrix/`

---

### qa_task_03 - Operacoes read-only de Atribuicoes - FAIL

**Tipos de teste:** UI + API  
**Casos executados:** 1/3; execucao interrompida na primeira falha  
**Relatorio individual:** `qa_task_03_acessos_operations/qa_report_task_03.md`

| Caso | Descricao | Status |
|------|-----------|--------|
| CT-01 | Gestor de Acessos consulta operacoes read-only globais | FAIL |
| CT-02 | Consultor de Acessos consulta operacoes read-only sem escrita | NAO EXECUTADO |
| CT-03 | Usuario sem papel recebe negacao segura em Acessos | NAO EXECUTADO |

**Expected:**

```text
O usuario gestor-acessos.dev deveria acessar /autorizacao/atribuicoes e visualizar a tela de Atribuicoes para operacoes administrativas.
```

**Actual:**

```text
O usuario gestor-acessos.dev autenticou, o shell exibiu o perfil "Gestor de Acessos", mas /autorizacao/atribuicoes renderizou:
"Acesso negado. Voce nao tem permissao para acessar esta area."
```

**Evidencias:**

- Screenshot: `qa_task_03_acessos_operations/screenshots/ct-01_gestor_acessos_dev_ui.png`
- Screenshot da falha: `qa_task_03_acessos_operations/screenshots/ct-01_gestor_acessos_dev_fail.png`
- Video: `qa_task_03_acessos_operations/videos/page@1715d624de2715355114b48fee05b90b.webm`
- Request/resultado: `qa_task_03_acessos_operations/requests.log`, `qa_task_03_acessos_operations/results.json`

---

### qa_task_04 - Concessao e revogacao dinamica - BLOCKED

**Tipos de teste planejados:** UI + API  
**Casos executados:** 0

**Motivo do bloqueio:**

Esta task depende de acesso administrativo funcional na tela/rotas de Atribuicoes. Como `qa_task_03` falhou no gate de acesso do usuario `gestor-acessos.dev`, a execucao de atribuicao/remocao foi bloqueada para evitar mutacao parcial sem o fluxo administrativo validado.

---

## Detalhes das Falhas

### FALHA 01 - Access tokens ainda contem claim `roles`

**Task:** `qa_task_01_login_tokens_env_qa`  
**Tipo:** OIDC / token  
**Usuarios impactados:** todos os usuarios testados na task 01.

**Expected:**

```text
Access token real sem claim top-level roles, sem claim role e sem scope roles.
```

**Actual:**

```text
Todos os payloads decodificados contem claim top-level roles.
Claim top-level role estava ausente.
Scope observado: access write.
Scope roles ausente.
```

**Evidencias relacionadas:**

- `qa_task_01_login_tokens/qa_report_task_01.md`
- `qa_task_01_login_tokens/artifacts/*.json`
- `qa_task_01_login_tokens/screenshots/*_fail.png`

### FALHA 02 - Gestor de Acessos nao acessa `/autorizacao/atribuicoes`

**Task:** `qa_task_03_acessos_operations`  
**Tipo:** UI / autorizacao efetiva  
**Usuario impactado:** `gestor-acessos.dev`

**Expected:**

```text
Rota /autorizacao/atribuicoes acessivel para Gestor de Acessos.
```

**Actual:**

```text
Shell autenticado exibiu "Gestor de Acessos", mas a rota mostrou "Acesso negado. Voce nao tem permissao para acessar esta area."
```

**Evidencias relacionadas:**

- `qa_task_03_acessos_operations/qa_report_task_03.md`
- `qa_task_03_acessos_operations/screenshots/ct-01_gestor_acessos_dev_fail.png`
- `qa_task_03_acessos_operations/results.json`

---

## Recomendacoes de Investigacao

### Investigar: Logto ainda emitindo `roles`

- **Contexto:** Gate de cutover exige token sem roles de negocio.
- **Comportamento observado:** todos os access tokens decodificados ainda possuem claim top-level `roles`.
- **Onde investigar:** tenant Logto, customizer de access token, configuracao de roles/claims e provisionamento auth-only.
- **Evidencias:** `qa_task_01_login_tokens/qa_report_task_01.md`.

### Investigar: permissao efetiva insuficiente para Atribuicoes

- **Contexto:** `gestor-acessos.dev` retorna 7 permissoes em `/api/me/permissions`, mas nao acessa `/autorizacao/atribuicoes`.
- **Comportamento observado:** UI renderiza acesso negado na rota de Atribuicoes.
- **Onde investigar:** permissoes efetivas do papel `acessos.default.gestor`, regra de rota/frontend para Atribuicoes e resposta do BFF para o usuario.
- **Evidencias:** `qa_task_02_permissions_matrix/qa_report_task_02.md` e `qa_task_03_acessos_operations/qa_report_task_03.md`.

---

## Indice de Evidencias

```text
qa-evidence/
├── qa_session.json
├── qa_report_consolidated.md
├── qa_task_01_login_tokens/
│   ├── qa_report_task_01.md
│   ├── test_plan.md
│   ├── requests.log
│   ├── artifacts/
│   ├── screenshots/
│   └── videos/
├── qa_task_02_permissions_matrix/
│   ├── qa_report_task_02.md
│   ├── test_plan.md
│   ├── requests.log
│   ├── execution-results.json
│   ├── screenshots/
│   └── videos/
├── qa_task_03_acessos_operations/
│   ├── qa_report_task_03.md
│   ├── test_plan.md
│   ├── requests.log
│   ├── results.json
│   ├── screenshots/
│   └── videos/
└── qa_task_04_dynamic_assignment/
    └── screenshots/
```

