---
status: completed
parallelizable: false
blocked_by: ["5.0", "8.0"]
---

<task_context>
<domain>frontend/app</domain>
<type>implementation</type>
<scope>configuration</scope>
<complexity>low</complexity>
<dependencies></dependencies>
<unblocks>"10.0"</unblocks>
</task_context>

# Tarefa 9.0: Frontend — App.tsx + .env.example

## Visão Geral

Wrappear App com AuthProvider (acima de QueryClientProvider) e atualizar .env.example com variáveis OIDC.

## Arquivos Envolvidos

- **Modificar:**
  - `frontend/src/App.tsx` — wrappear com `<AuthProvider>` (outermost provider)
  - `frontend/.env.example` — +VITE_OIDC_AUTHORITY, +VITE_OIDC_CLIENT_ID, +VITE_OIDC_REDIRECT_URI, +VITE_OIDC_POST_LOGOUT_REDIRECT_URI

## Subtarefas

- [x] 9.1 App.tsx: `<AuthProvider><QueryClientProvider ...><RouterProvider .../></QueryClientProvider></AuthProvider>`
- [x] 9.2 .env.example: adicionar 4 variáveis OIDC com valores placeholder
- [x] 9.3 `npm run build`

## Evidências de Execução

- `frontend/src/App.tsx` atualizado para envolver toda a árvore com `AuthProvider`, acima de `AppProviders`, `ToastProvider` e `RouterProvider`
- `frontend/.env.example` já continha as 4 variáveis OIDC exigidas (`VITE_OIDC_AUTHORITY`, `VITE_OIDC_CLIENT_ID`, `VITE_OIDC_REDIRECT_URI`, `VITE_OIDC_POST_LOGOUT_REDIRECT_URI`) e permaneceu compatível com a task
- `npm run build` executado com sucesso em `frontend/`

## Critérios de Sucesso (Verificáveis)

- [x] `npm run build` compila sem erros
- [x] AuthProvider é o provider mais externo
- [x] .env.example contém as 4 variáveis OIDC
