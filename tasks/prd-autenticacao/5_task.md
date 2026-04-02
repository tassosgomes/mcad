---
status: completed
parallelizable: false
blocked_by: ["4.0"]
---

<task_context>
<domain>frontend/shared</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies></dependencies>
<unblocks>"6.0, 9.0"</unblocks>
</task_context>

# Tarefa 5.0: Frontend — CallbackPage + ProtectedRoute + Router update

## Visão Geral

Criar CallbackPage (processa redirect do Keycloak) e ProtectedRoute (redirect se não autenticado). Atualizar router com rota /callback e wrapper ProtectedRoute no layout principal.

## Arquivos Envolvidos

- **Criar:**
  - `frontend/src/shared/auth/CallbackPage.tsx`
  - `frontend/src/shared/auth/ProtectedRoute.tsx`
- **Modificar:**
  - `frontend/src/app/router/routes.tsx` — +rota /callback, +ProtectedRoute wrapper no layout
  - `frontend/src/shared/auth/index.ts` — +export CallbackPage, ProtectedRoute

## Subtarefas

- [x] 5.1 CallbackPage: signinRedirectCallback() → navigate para returnUrl
- [x] 5.2 ProtectedRoute: se !isAuthenticated → login(); senão → render children
- [x] 5.3 routes.tsx: `{ path: '/callback', element: <CallbackPage /> }` (fora do ProtectedRoute)
- [x] 5.4 routes.tsx: wrap MainLayout com `<ProtectedRoute>`
- [x] 5.5 `npm run build`

## Evidências de Execução

- `CallbackPage.tsx` e `ProtectedRoute.tsx` já estavam implementados em `frontend/src/shared/auth/` pela task 4.0 e foram reutilizados nesta task
- `frontend/src/app/router/routes.tsx` atualizado para expor `/callback` fora do `ProtectedRoute`
- `frontend/src/app/router/routes.tsx` atualizado para envelopar o `MainLayout` com `<ProtectedRoute>`
- `npm run build` executado com sucesso em `frontend/` após a integração do router

## Critérios de Sucesso (Verificáveis)

- [x] /callback processa o retorno do Keycloak
- [x] Rotas protegidas redirecionam para login se não autenticado
- [x] /callback não está dentro do ProtectedRoute (evita loop)
