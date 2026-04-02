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
<unblocks>"7.0, 8.0"</unblocks>
</task_context>

# Tarefa 6.0: Frontend — apiClient + Authorization header

## Visão Geral

Modificar apiClient para incluir `Authorization: Bearer {token}` em todos os requests. Usar padrão de injeção: `setAuthTokenProvider(fn)` chamado pelo AuthProvider.

## Arquivos Envolvidos

- **Modificar:**
  - `frontend/src/shared/services/apiClient.ts` — +setAuthTokenProvider, +fetchWithAuth que injeta header, substituir fetch por fetchWithAuth em todas as funções
  - `frontend/src/shared/auth/AuthProvider.tsx` — chamar `setAuthTokenProvider(getToken)` no mount

## Subtarefas

- [x] 6.1 apiClient: exportar `setAuthTokenProvider(fn: () => string | null)`
- [x] 6.2 apiClient: criar `fetchWithAuth` que adiciona `Authorization: Bearer {token}` se token disponível
- [x] 6.3 Substituir `fetch(` por `fetchWithAuth(` em apiGet, apiPost, apiPut, apiDelete, apiDeleteWithBody
- [x] 6.4 AuthProvider: `useEffect(() => setAuthTokenProvider(getToken), [getToken])`
- [x] 6.5 `npm run build`

## Evidências de Execução

- `frontend/src/shared/services/apiClient.ts` agora exporta `setAuthTokenProvider` e centraliza requests em `fetchWithAuth`
- `fetchWithAuth` injeta `Authorization: Bearer <token>` apenas quando o provider retorna token; sem token o request segue sem header
- `apiGet`, `apiPost`, `apiPut`, `apiDelete` e `apiDeleteWithBody` foram migrados para `fetchWithAuth`; `apiPatch` também foi alinhado para manter o cliente consistente
- `frontend/src/shared/auth/AuthProvider.tsx` passou a registrar e limpar o token provider via `useEffect`, usando o usuário autenticado atual como fonte do access token
- `npm run build` executado com sucesso em `frontend/`

## Critérios de Sucesso (Verificáveis)

- [x] Todos os requests incluem Authorization header quando autenticado
- [x] Sem token (pré-login), requests são enviados sem header (para /callback etc.)
