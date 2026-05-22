# QA Report - Login, Logout e OIDC/PKCE

**Task ID:** qa_task_01
**Slug:** login_logout_oidc
**Data/Hora:** 2026-05-20T02:29:18Z
**Status Geral:** FAIL

---

## Contexto

- **User Story:** Validar login, callback OIDC/PKCE, uso de Bearer token e logout nos perfis de teste.
- **Ambiente:** https://mcad.tasso.dev.br
- **Tipos de teste:** UI + API observada via browser
- **Autenticacao:** Sim, OIDC Authorization Code + PKCE
- **Ferramenta:** Playwright CLI
- **Regra de parada:** execucao interrompida no primeiro FAIL com `--max-failures=1`

## Observacao de execucao

A primeira tentativa falhou antes de abrir o browser por restricao local do sandbox do Chromium. A task foi reexecutada com Playwright fora do sandbox para validar o sistema de fato. O resultado abaixo reflete a reexecucao valida.

---

## Casos de Teste

| ID | Descricao | Tipo | Status |
|----|-----------|------|--------|
| CT-01 | Login/logout OIDC - analista_cadastro | UI + API | PASS |
| CT-02 | Login/logout OIDC - analista_distribuicao | UI + API | PASS |
| CT-03 | Login/logout OIDC - analista_identificacao | UI + API | PASS |
| CT-04 | Login/logout OIDC - analista_arrecadacao | UI + API | PASS |
| CT-05 | Login/logout OIDC - consultor_cadastro | UI + API | FAIL |
| CT-06 | Login/logout OIDC - consultor_distribuicao | UI + API | NAO EXECUTADO (bloqueado por CT-05) |
| CT-07 | Login/logout OIDC - consultor_identificacao | UI + API | NAO EXECUTADO (bloqueado por CT-05) |
| CT-08 | Login/logout OIDC - consultor_arrecadacao | UI + API | NAO EXECUTADO (bloqueado por CT-05) |

---

## Detalhes por Caso

### CT-01 - Login/logout OIDC - analista_cadastro - PASS

**Resultado observado:** callback OIDC observado com `code`, `iss` e `state`; chamada `GET /api/me/permissions` observada com `Authorization: Bearer [TOKEN OMITIDO]`; endpoint retornou HTTP 200; logout concluiu em `/logout`; acesso posterior a rota protegida redirecionou ao IdP.

**Evidencias:** screenshots `ct-01_*`, `requests.log`, `execution-results.json`.

### CT-02 - Login/logout OIDC - analista_distribuicao - PASS

**Resultado observado:** callback OIDC observado com `code`, `iss` e `state`; chamada `GET /api/me/permissions` observada com `Authorization: Bearer [TOKEN OMITIDO]`; endpoint retornou HTTP 200; logout concluiu em `/logout`; acesso posterior a rota protegida redirecionou ao IdP.

**Evidencias:** screenshots `ct-02_*`, `requests.log`, `execution-results.json`.

### CT-03 - Login/logout OIDC - analista_identificacao - PASS

**Resultado observado:** callback OIDC observado com `code`, `iss` e `state`; chamada `GET /api/me/permissions` observada com `Authorization: Bearer [TOKEN OMITIDO]`; endpoint retornou HTTP 200; logout concluiu em `/logout`; acesso posterior a rota protegida redirecionou ao IdP.

**Evidencias:** screenshots `ct-03_*`, `requests.log`, `execution-results.json`.

### CT-04 - Login/logout OIDC - analista_arrecadacao - PASS

**Resultado observado:** callback OIDC observado com `code`, `iss` e `state`; chamada `GET /api/me/permissions` observada com `Authorization: Bearer [TOKEN OMITIDO]`; endpoint retornou HTTP 200; logout concluiu em `/logout`; acesso posterior a rota protegida redirecionou ao IdP.

**Evidencias:** screenshots `ct-04_*`, `requests.log`, `execution-results.json`.

### CT-05 - Login/logout OIDC - consultor_cadastro - FAIL

**Pre-condicao:** usuario `consultor_cadastro` disponivel no IdP e browser context limpo.

**Passos executados ate a falha:**

1. Abrir `https://mcad.tasso.dev.br`.
2. Redirecionar para a tela de login do Logto.
3. Preencher usuario `consultor_cadastro`.
4. Preencher senha compartilhada de QA (valor mascarado nos artefatos).
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

- Screenshot inicial IdP: `screenshots/ct-05_consultor_cadastro_idp_start.png`
- Screenshot falha: `screenshots/ct-05_consultor_cadastro_fail.png`
- Playwright error context: `videos/qa_task_01_login_logout_oi-c5af1-DC-CT-05-consultor-cadastro-chromium/error-context.md`
- Playwright video: `videos/qa_task_01_login_logout_oi-c5af1-DC-CT-05-consultor-cadastro-chromium/video.webm`
- Request/Response log: `requests.log`

**Nota de seguranca:** o arquivo `trace.zip` gerado automaticamente pelo Playwright foi removido porque eventos internos de input podem conter o valor digitado no campo de senha. As demais evidencias textuais foram sanitizadas.

**NOTA:** Execucao interrompida apos esta falha. CT-06 a CT-08 nao foram executados.

---

## Resumo de Evidencias

```text
qa_task_01_login_logout_oidc/
├── test_plan.md
├── qa_report_task_01.md
├── requests.log
├── execution-results.json
├── playwright.config.mjs
├── qa_task_01_login_logout_oidc.spec.mjs
├── screenshots/
└── videos/
```

---

## Informacoes para o Orquestrador

**Status final:** FAIL
**Motivo:** CT-05 falhou na autenticacao do usuario `consultor_cadastro`; o IdP retornou HTTP 422 e exibiu mensagem de credenciais incorretas.
**Tasks impactadas:** tasks que dependem de autenticacao de consultores ou da validacao completa de login/logout devem ser tratadas como BLOCKED ate a credencial/usuario `consultor_cadastro` ser validado.
