---
status: completed
parallelizable: true
blocked_by: ["0.0"]
---

<task_context>
<domain>frontend/shared</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies></dependencies>
<unblocks>"5.0, 6.0"</unblocks>
</task_context>

# Tarefa 4.0: Frontend — Instalar oidc-client-ts + criar shared/auth

## Visão Geral

Instalar `oidc-client-ts`, criar toda a infraestrutura de autenticação em `shared/auth/`: configuração OIDC do .env, AuthContext com user/roles/hasRole, AuthProvider que wrapa UserManager, hook useAuth.

## Arquivos Envolvidos

- **Criar:**
  - `frontend/src/shared/auth/authConfig.ts`
  - `frontend/src/shared/auth/AuthContext.tsx`
  - `frontend/src/shared/auth/AuthProvider.tsx`
  - `frontend/src/shared/auth/useAuth.ts`
  - `frontend/src/shared/auth/index.ts`
- **Referência:**
  - `docs/architecture/auth-plan.md` (seção Frontend)
  - `tasks/prd-autenticacao/techspec-frontend.md`

## Subtarefas

- [x] 4.1 `npm install oidc-client-ts`
- [x] 4.2 authConfig.ts: UserManagerSettings com authority, client_id, redirect_uri, post_logout_redirect_uri, response_type='code', scope='openid profile', automaticSilentRenew=true
- [x] 4.3 AuthContext.tsx: React Context com user, isAuthenticated, roles, hasRole, login, logout, getToken
- [x] 4.4 AuthProvider.tsx: UserManager instanciado, getUser no mount, event listeners (userLoaded, userUnloaded), extrai roles de `user.profile.realm_access.roles`
- [x] 4.5 useAuth.ts: hook que consome AuthContext
- [x] 4.6 index.ts: exporta AuthProvider, useAuth, ProtectedRoute (task 5.0), CallbackPage (task 5.0)
- [x] 4.7 `npm run build`

## Evidências de Execução

- `npm install oidc-client-ts` executado com sucesso em `frontend/`
- Criado `frontend/src/shared/auth/` com `authConfig.ts`, `AuthContext.tsx`, `AuthProvider.tsx`, `useAuth.ts` e `index.ts`
- `authConfig.ts` usa `UserManagerSettings` com `authority`, `client_id`, `redirect_uri`, `post_logout_redirect_uri`, `response_type='code'`, `scope='openid profile'`, `automaticSilentRenew=true` e `userStore` em memória
- `AuthProvider` inicializa `UserManager`, carrega `getUser()` no mount, registra listeners `userLoaded`/`userUnloaded` e expõe `roles`, `hasRole`, `login`, `logout` e `getToken`
- `index.ts` reexporta `AuthProvider`, `useAuth`, `ProtectedRoute` e `CallbackPage`, deixando a API pública pronta para as tasks 5.0 e 6.0
- `npm run build` executado com sucesso após correção de erros TypeScript preexistentes no frontend

## Critérios de Sucesso (Verificáveis)

- [x] `npm run build` compila sem erros
- [x] oidc-client-ts instalado no package.json
- [x] useAuth expõe: user, isAuthenticated, roles, hasRole, login, logout, getToken
- [x] Zero imports de keycloak-js
