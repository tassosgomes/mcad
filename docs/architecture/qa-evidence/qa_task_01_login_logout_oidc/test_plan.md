# CASOS DE TESTE - Login, Logout e OIDC/PKCE

**Task ID:** qa_task_01
**Slug:** login_logout_oidc
**Base URL:** https://mcad.tasso.dev.br
**Tipos:** UI + API observada via browser
**Autenticacao:** OIDC Authorization Code + PKCE, callback em `/callback`, Bearer token em chamadas HTTP autenticadas

## Criterios gerais

- As credenciais devem ser usadas somente em runtime.
- Senha, tokens, authorization code, state, cookies e headers sensiveis devem ser mascarados nos logs.
- A execucao deve parar no primeiro FAIL.
- Evidencias devem ser salvas em `screenshots/`, `videos/` e `requests.log`.
- A validacao de Bearer token deve comprovar presenca do header `Authorization: Bearer <valor>` sem persistir o valor.

## CT-01: Login/logout OIDC - analista_cadastro

Pre-condicao: usuario `analista_cadastro` existe no IdP e nao ha sessao local reaproveitada no browser context.

Passos:
1. Acessar rota protegida da aplicacao.
2. Confirmar redirecionamento para o IdP OIDC.
3. Autenticar com usuario e senha compartilhada em runtime.
4. Confirmar passagem pelo callback `/callback` com parametros OIDC esperados.
5. Confirmar retorno ao app em rota protegida.
6. Confirmar chamada autenticada com header Bearer para `/api/me/permissions`.
7. Acionar logout pelo botao `Sair`.
8. Confirmar retorno para `/logout` e tela de logout concluido.
9. Acessar rota protegida novamente e confirmar novo redirecionamento ao IdP, sem reutilizar a sessao local.

Expected: fluxo conclui sem erro, o callback e observado, a chamada autenticada usa Bearer token mascarado no log, e logout encerra a sessao local.

Tipo: UI + API

## CT-02: Login/logout OIDC - analista_distribuicao

Pre-condicao: usuario `analista_distribuicao` existe no IdP e nao ha sessao local reaproveitada no browser context.

Passos: mesmos passos do CT-01.

Expected: mesmos resultados esperados do CT-01 para o perfil `analista_distribuicao`.

Tipo: UI + API

## CT-03: Login/logout OIDC - analista_identificacao

Pre-condicao: usuario `analista_identificacao` existe no IdP e nao ha sessao local reaproveitada no browser context.

Passos: mesmos passos do CT-01.

Expected: mesmos resultados esperados do CT-01 para o perfil `analista_identificacao`.

Tipo: UI + API

## CT-04: Login/logout OIDC - analista_arrecadacao

Pre-condicao: usuario `analista_arrecadacao` existe no IdP e nao ha sessao local reaproveitada no browser context.

Passos: mesmos passos do CT-01.

Expected: mesmos resultados esperados do CT-01 para o perfil `analista_arrecadacao`.

Tipo: UI + API

## CT-05: Login/logout OIDC - consultor_cadastro

Pre-condicao: usuario `consultor_cadastro` existe no IdP e nao ha sessao local reaproveitada no browser context.

Passos: mesmos passos do CT-01.

Expected: mesmos resultados esperados do CT-01 para o perfil `consultor_cadastro`.

Tipo: UI + API

## CT-06: Login/logout OIDC - consultor_distribuicao

Pre-condicao: usuario `consultor_distribuicao` existe no IdP e nao ha sessao local reaproveitada no browser context.

Passos: mesmos passos do CT-01.

Expected: mesmos resultados esperados do CT-01 para o perfil `consultor_distribuicao`.

Tipo: UI + API

## CT-07: Login/logout OIDC - consultor_identificacao

Pre-condicao: usuario `consultor_identificacao` existe no IdP e nao ha sessao local reaproveitada no browser context.

Passos: mesmos passos do CT-01.

Expected: mesmos resultados esperados do CT-01 para o perfil `consultor_identificacao`.

Tipo: UI + API

## CT-08: Login/logout OIDC - consultor_arrecadacao

Pre-condicao: usuario `consultor_arrecadacao` existe no IdP e nao ha sessao local reaproveitada no browser context.

Passos: mesmos passos do CT-01.

Expected: mesmos resultados esperados do CT-01 para o perfil `consultor_arrecadacao`.

Tipo: UI + API
