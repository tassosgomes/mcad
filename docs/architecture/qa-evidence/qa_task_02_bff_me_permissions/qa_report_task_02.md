# QA Report - BFF /api/me e /api/me/permissions

**Task ID:** qa_task_02
**Slug:** bff_me_permissions
**Status Geral:** BLOCKED

## Motivo do bloqueio

A task depende da validacao completa de login/logout em `qa_task_01`. A `qa_task_01` falhou no CT-05 (`consultor_cadastro`), com HTTP 422 do IdP e mensagem de credenciais incorretas.

## Casos planejados

| ID | Descricao | Status |
|----|-----------|--------|
| CT-01 | GET /api/me com token valido | NAO EXECUTADO |
| CT-02 | GET /api/me/permissions com token valido e `X-Authz-Version` | NAO EXECUTADO |
| CT-03 | GET /api/me/permissions sem token retorna 401 | NAO EXECUTADO |
| CT-04 | Tratamento de token invalido/sessao invalida | NAO EXECUTADO |

## Evidencias relacionadas

- `../qa_task_01_login_logout_oidc/qa_report_task_01.md`
- `../qa_task_01_login_logout_oidc/requests.log`
