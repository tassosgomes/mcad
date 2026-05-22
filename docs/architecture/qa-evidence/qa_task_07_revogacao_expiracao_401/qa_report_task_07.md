# QA Report - Revogacao, Expiracao e 401

**Task ID:** qa_task_07
**Slug:** revogacao_expiracao_401
**Status Geral:** BLOCKED

## Motivo do bloqueio

A task depende da verificacao do BFF (`qa_task_02`) e da autenticacao base (`qa_task_01`). Como `qa_task_01` falhou e `qa_task_02` ficou bloqueada, esta task nao foi executada.

## Casos planejados

| ID | Descricao | Status |
|----|-----------|--------|
| CT-01 | Requisicao sem token retorna 401 | NAO EXECUTADO |
| CT-02 | Sessao/token invalido aciona tratamento de 401 | NAO EXECUTADO |
| CT-03 | Logout invalida acesso subsequente a rota protegida | NAO EXECUTADO |

## Evidencias relacionadas

- `../qa_task_01_login_logout_oidc/qa_report_task_01.md`
- `../qa_task_02_bff_me_permissions/qa_report_task_02.md`
