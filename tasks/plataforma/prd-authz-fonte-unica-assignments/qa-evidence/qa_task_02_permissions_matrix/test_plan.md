# CASOS DE TESTE — Permissions Matrix `.env_qa`

**Task ID:** qa_task_02_permissions_matrix_env_qa  
**Ambiente:** https://mcad.tasso.dev.br  
**Tipos:** UI + API  
**Autenticacao:** Sim, OIDC Logto via browser.  
**Banco:** Nao habilitado para esta sessao.

## CT-01: Matriz de `/api/me` e `/api/me/permissions` para cada usuario `.env_qa`

**Pre-condicao:** arquivo `.env_qa` presente no repositorio com usuarios QA e credenciais validas.

**Passos:**
1. Ler os usuarios do `.env_qa` sem imprimir senhas/tokens.
2. Para cada usuario, iniciar contexto isolado no browser.
3. Autenticar no Logto pela UI.
4. Capturar o token Bearer observado nas chamadas autenticadas do frontend, sem grava-lo.
5. Chamar `GET /api/me` com o token ativo.
6. Chamar `GET /api/me/permissions` com o mesmo token ativo.
7. Registrar resumo sanitizado: HTTP status, subject/email quando retornados, quantidade de permissoes, `authzVersion` e `primaryRole`.

**Expected:**
- Login OIDC conclui e retorna para a aplicacao.
- `GET /api/me` retorna HTTP 2xx; `subject`/email/perfil principal sao registrados quando retornados.
- `GET /api/me/permissions` retorna HTTP 2xx com `permissions` em array e `version`/`x-authz-version`.
- Usuarios com papel efetivo retornam ao menos uma permissao.

**Tipo:** UI + API

## CT-02: Usuario `sem_papel` deny-safe

**Pre-condicao:** usuario `sem_papel` existe no `.env_qa` e nao possui assignment efetivo no `ecad-authz`.

**Passos:**
1. Autenticar `sem_papel` via Logto.
2. Chamar `GET /api/me`.
3. Chamar `GET /api/me/permissions`.
4. Validar comportamento deny-safe.

**Expected:**
- Usuario autentica normalmente.
- `GET /api/me` retorna identidade ou metadados basicos.
- `GET /api/me/permissions` retorna HTTP 2xx com `permissions: []`, ou resposta deny-safe nao 2xx documentada pelo BFF sem expor permissoes.

**Tipo:** UI + API
