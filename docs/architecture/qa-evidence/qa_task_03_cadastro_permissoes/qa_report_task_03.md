# QA Report - Cadastro Permissoes

**Task ID:** qa_task_03
**Slug:** cadastro_permissoes
**Status Geral:** BLOCKED

## Motivo do bloqueio

A task exige os perfis `analista_cadastro` e `consultor_cadastro`. A autenticacao de `consultor_cadastro` falhou na `qa_task_01` com HTTP 422 do IdP e mensagem de credenciais incorretas. Sem esse perfil, nao e possivel validar o contraste consultor/analista previsto no plano.

## Casos planejados

| ID | Descricao | Status |
|----|-----------|--------|
| CT-01 | Consultor Cadastro acessa fluxos de leitura | NAO EXECUTADO |
| CT-02 | Consultor Cadastro nao executa escrita | NAO EXECUTADO |
| CT-03 | Analista Cadastro executa escrita permitida | NAO EXECUTADO |
| CT-04 | UI de Cadastro reflete permissoes efetivas | NAO EXECUTADO |

## Evidencias relacionadas

- `../qa_task_01_login_logout_oidc/qa_report_task_01.md`
- `../qa_task_01_login_logout_oidc/screenshots/ct-05_consultor_cadastro_fail.png`
