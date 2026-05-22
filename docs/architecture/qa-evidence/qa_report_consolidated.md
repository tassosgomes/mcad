# Relatorio de Testes QA - Autenticacao e Autorizacao MCAD

**Data da Sessao:** 2026-05-20T02:11:18Z
**Ambiente testado:** https://mcad.tasso.dev.br
**PRD:** `mcad/docs/architecture/auth-plan.md`
**Techspec:** `mcad/docs/migracao-authz/guia-operacional.md` + `mcad/docs/authz/catalog/*`
**Relatorio:** Markdown

---

## Sumario Executivo

| Metrica | Resultado |
|---------|-----------|
| Tasks executadas | 1 de 7 |
| Tasks com PASS | 0 |
| Tasks com FAIL | 1 |
| Tasks bloqueadas | 6 |
| Casos de teste total | 31 |
| Casos PASS | 4 |
| Casos FAIL | 1 |
| Casos nao executados | 26 |
| Resultado geral | REPROVADO |

Resultado geral e **REPROVADO** porque a task base de login/logout falhou no perfil `consultor_cadastro`, e as tasks dependentes foram bloqueadas.

### Features testadas

| Feature / User Story | Task | Status |
|----------------------|------|--------|
| Login, callback OIDC/PKCE, Bearer token e logout | qa_task_01 | FAIL |
| BFF `/api/me` e `/api/me/permissions` | qa_task_02 | BLOCKED |
| Autorizacao fina Cadastro | qa_task_03 | BLOCKED |
| Autorizacao fina Identificacao | qa_task_04 | BLOCKED |
| Autorizacao fina Arrecadacao | qa_task_05 | BLOCKED |
| Autorizacao fina Distribuicao | qa_task_06 | BLOCKED |
| Revogacao, expiracao e tratamento de 401 | qa_task_07 | BLOCKED |

### Escopo excluido conforme acordado

| Feature | Motivo da exclusao |
|---------|-------------------|
| Validacao direta em banco | Nao incluida nesta rodada. |
| Correcoes de codigo | Sessao de QA deve apenas reportar achados. |
| Alteracoes destrutivas em dados reais | Ambiente testado e o deploy publicado. |

---

## Resultado por Feature

### qa_task_01 - Login, Logout e OIDC/PKCE - FAIL

**Tipos de teste:** UI + API observada via browser
**Casos executados:** 5/8
**Observacao:** a primeira tentativa falhou por restricao local do sandbox do Chromium. A task foi reexecutada com Playwright fora do sandbox, e o resultado abaixo reflete a execucao valida.

| Caso | Descricao | Status |
|------|-----------|--------|
| CT-01 | Login/logout OIDC - analista_cadastro | PASS |
| CT-02 | Login/logout OIDC - analista_distribuicao | PASS |
| CT-03 | Login/logout OIDC - analista_identificacao | PASS |
| CT-04 | Login/logout OIDC - analista_arrecadacao | PASS |
| CT-05 | Login/logout OIDC - consultor_cadastro | FAIL |
| CT-06 | Login/logout OIDC - consultor_distribuicao | NAO EXECUTADO |
| CT-07 | Login/logout OIDC - consultor_identificacao | NAO EXECUTADO |
| CT-08 | Login/logout OIDC - consultor_arrecadacao | NAO EXECUTADO |

**Evidencias:** `qa-evidence/qa_task_01_login_logout_oidc/`

### qa_task_02 - BFF /api/me e /api/me/permissions - BLOCKED

**Motivo do bloqueio:** depende da validacao completa de `qa_task_01`. Como `qa_task_01` falhou no perfil `consultor_cadastro`, esta task nao foi executada.

**Casos executados:** 0/4

### qa_task_03 - Cadastro Permissoes - BLOCKED

**Motivo do bloqueio:** depende de `qa_task_01` e exige o perfil `consultor_cadastro`, que falhou na autenticacao.

**Casos executados:** 0/4

### qa_task_04 - Identificacao Permissoes - BLOCKED

**Motivo do bloqueio:** depende de `qa_task_01` e `qa_task_02`; ambas nao ficaram com status PASS completo.

**Casos executados:** 0/4

### qa_task_05 - Arrecadacao Permissoes - BLOCKED

**Motivo do bloqueio:** depende de `qa_task_01` e `qa_task_02`; ambas nao ficaram com status PASS completo.

**Casos executados:** 0/4

### qa_task_06 - Distribuicao Permissoes - BLOCKED

**Motivo do bloqueio:** depende de `qa_task_01` e `qa_task_02`; ambas nao ficaram com status PASS completo.

**Casos executados:** 0/4

### qa_task_07 - Revogacao, Expiracao e 401 - BLOCKED

**Motivo do bloqueio:** depende da verificacao do BFF (`qa_task_02`) e da autenticacao base (`qa_task_01`).

**Casos executados:** 0/3

---

## Detalhes das Falhas

### FALHA 01 - qa_task_01 / CT-05

**User Story:** Login, callback OIDC/PKCE, Bearer token e logout
**Caso de Teste:** CT-05 - Login/logout OIDC - `consultor_cadastro`
**Tipo:** UI + API observada via browser

**Pre-condicao:** usuario `consultor_cadastro` disponivel no IdP e browser context limpo.

**Passos executados ate a falha:**

1. Abrir `https://mcad.tasso.dev.br`.
2. Redirecionar para a tela de login do Logto.
3. Preencher usuario `consultor_cadastro`.
4. Preencher senha compartilhada de QA, mascarada nos artefatos.
5. Clicar em `Sign in`.
6. Aguardar retorno para a origem da aplicacao MCAD.

**Expected:**

```text
Login aceito pelo IdP, retorno para a aplicacao MCAD, callback OIDC com code/state,
chamada GET /api/me/permissions com Authorization: Bearer [TOKEN OMITIDO] e logout concluido.
```

**Actual:**

```text
O IdP respondeu HTTP 422 no POST /api/experience/verification/password e a tela exibiu:
"Incorrect account or password. Please check your input."
A navegacao de volta para a aplicacao nao ocorreu em 60s.
```

**Erro capturado:**

```text
TimeoutError: page.waitForURL: Timeout 60000ms exceeded.
waiting for navigation until "load"
```

**Console do browser:**

```text
[error] Failed to load resource: the server responded with a status of 422 ()
```

**Evidencias:**

- Screenshot inicial IdP: `qa-evidence/qa_task_01_login_logout_oidc/screenshots/ct-05_consultor_cadastro_idp_start.png`
- Screenshot falha: `qa-evidence/qa_task_01_login_logout_oidc/screenshots/ct-05_consultor_cadastro_fail.png`
- Request/Response log: `qa-evidence/qa_task_01_login_logout_oidc/requests.log`
- Resultado estruturado: `qa-evidence/qa_task_01_login_logout_oidc/execution-results.json`
- Playwright error context: `qa-evidence/qa_task_01_login_logout_oidc/videos/qa_task_01_login_logout_oi-c5af1-DC-CT-05-consultor-cadastro-chromium/error-context.md`
- Playwright video: `qa-evidence/qa_task_01_login_logout_oidc/videos/qa_task_01_login_logout_oi-c5af1-DC-CT-05-consultor-cadastro-chromium/video.webm`

**Nota de seguranca:** os arquivos `trace.zip` gerados automaticamente pelo Playwright foram removidos porque eventos internos de input podem conter o valor digitado no campo de senha. As demais evidencias textuais foram sanitizadas.

---

## Recomendacoes de Investigacao

### Investigar autenticacao do perfil `consultor_cadastro`

- **Contexto:** login OIDC no Logto pelo deploy `https://mcad.tasso.dev.br`.
- **Comportamento observado:** `consultor_cadastro` recebeu HTTP 422 no endpoint de verificacao de senha do IdP e mensagem de credenciais incorretas.
- **Onde investigar:** cadastro/provisionamento do usuario `consultor_cadastro` no IdP, status do usuario, senha vigente e disponibilidade do usuario para o client OIDC do MCAD.
- **Evidencias relacionadas:** `qa_task_01_login_logout_oidc/requests.log`, screenshots `ct-05_*`, video e error context Playwright do CT-05.

### Investigar cobertura bloqueada por dependencia

- **Contexto:** BFF e dominios Cadastro, Identificacao, Arrecadacao e Distribuicao nao foram executados por dependencia da autenticacao base.
- **Comportamento observado:** a suite parou no primeiro FAIL da `qa_task_01`, conforme regra da skill.
- **Onde investigar:** apos liberar o perfil `consultor_cadastro`, reexecutar `qa_task_01` e entao as tasks `qa_task_02` a `qa_task_07`.
- **Evidencias relacionadas:** relatorios individuais `qa_report_task_02.md` a `qa_report_task_07.md`.

---

## Indice de Evidencias

```text
qa-evidence/
├── qa_session.json
├── qa_report_consolidated.md
├── qa_task_01_login_logout_oidc/
│   ├── test_plan.md
│   ├── qa_report_task_01.md
│   ├── requests.log
│   ├── execution-results.json
│   ├── playwright.config.mjs
│   ├── qa_task_01_login_logout_oidc.spec.mjs
│   ├── screenshots/
│   └── videos/
├── qa_task_02_bff_me_permissions/
│   └── qa_report_task_02.md
├── qa_task_03_cadastro_permissoes/
│   └── qa_report_task_03.md
├── qa_task_04_identificacao_permissoes/
│   └── qa_report_task_04.md
├── qa_task_05_arrecadacao_permissoes/
│   └── qa_report_task_05.md
├── qa_task_06_distribuicao_permissoes/
│   └── qa_report_task_06.md
└── qa_task_07_revogacao_expiracao_401/
    └── qa_report_task_07.md
```

---

## Informacoes da Sessao

| Campo | Valor |
|-------|-------|
| Banco de dados validado | Nao |
| Tipo de banco | N/A |
| Autenticacao testada | Sim |
| Playwright UI | Sim |
| cURL/API direto | Nao |
| Tasks em paralelo | Nao executadas, bloqueadas por dependencia |
| Credenciais gravadas em arquivo | Nao. Senha, tokens e Authorization foram mascarados em artefatos textuais. |
