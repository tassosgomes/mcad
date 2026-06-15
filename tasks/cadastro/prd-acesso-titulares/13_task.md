---
status: pending
parallelizable: false
blocked_by: ["5.0"]
---

<task_context>
<domain>frontend/infra</domain>
<type>implementation</type>
<scope>middleware</scope>
<complexity>high</complexity>
<dependencies>http_server</dependencies>
<unblocks>"14.0", "15.0"</unblocks>
</task_context>

# Tarefa 13.0: Frontend — Infraestrutura do Portal (PortalAuthProvider, PortalLayout, authenticatedFetch, rotas)

## Visão Geral

Montar a infraestrutura frontend do Portal do Titular como uma sub-árvore `/portal/*` no mesmo Vite app, com provedor de autenticação próprio (JWT do titular, **não** OIDC/Logto), layout isolado e um client de API que não colide com os 7 setters singleton do fluxo OIDC existente.

## Requisitos

- PRD — seção *Considerações de UI* e *Restrições Técnicas*
- Tech Spec — seção *Arquitetura do Sistema* (diagrama) e *Análise de Impacto* (`authenticatedFetch.ts`)

## Subtarefas

- [ ] 13.1 Refatorar `frontend/src/shared/services/authenticatedFetch.ts` — alterar `createAuthenticatedFetchClient()` para aceitar um `tokenProvider?: () => Promise<string | null>` por instância. Quando omitido, usa o provider singleton OIDC existente (default). Manter retrocompatibilidade: os 7 clients existentes (`apiClient`, `apiArrecadacaoClient`, etc.) continuam usando o setter singleton.
- [ ] 13.2 Criar `frontend/src/features/portal/shared/api/portalClient.ts` — instância de `createAuthenticatedFetchClient` com `tokenProvider` próprio que lê o token do titular do `PortalAuthContext`. Base URL: `runtimeConfig.portalApiBaseUrl` (novo campo). Helpers `portalGet/portalPost/portalPut`.
- [ ] 13.3 Adicionar `portalApiBaseUrl` ao `frontend/src/shared/config/runtimeConfig.ts` (default `/api/cadastro/v1/portal`).
- [ ] 13.4 Adicionar `PORTAL_API_BASE_URL` ao `frontend/public/runtime-env.template.js` e validar no `frontend/docker/40-runtime-env.sh`.
- [ ] 13.5 Criar `frontend/src/features/portal/shared/auth/PortalAuthProvider.tsx` — React context que:
  - Expõe `{ titular, token, isAuthenticated, login, logout, signup }`.
  - `login(documento, senha)` → `POST /portal/auth/login` → armazena token (sessionStorage ou localStorage) + `titular`.
  - `signup(documento, caeIpi, senha)` → `POST /portal/auto-cadastro`.
  - `logout()` → limpa token.
  - Lê token persistido ao montar (auto-restore).
  - **Não** usa `oidc-client-ts` — é um fluxo simples de fetch + token.
- [ ] 13.6 Criar `frontend/src/features/portal/shared/auth/PortalProtectedRoute.tsx` — se `!isAuthenticated`, redireciona para `/portal/login`. Espelha `ProtectedRoute.tsx` mas usa o `PortalAuthContext`.
- [ ] 13.7 Criar `frontend/src/features/portal/shared/layout/PortalLayout.tsx` — layout próprio do portal (header simples com nome do titular + logout, sem Sidebar de domínios internos). `<Outlet/>` no centro. Não reutiliza `MainLayout`/`Sidebar`/`Header` do fluxo OIDC.
- [ ] 13.8 Registrar rotas `/portal/*` no `frontend/src/app/router/routes.tsx` como rota top-level **sibling** de `/` (não aninhar em `ProtectedRoute` OIDC):
  ```
  /portal/login          → PortalLoginPage (público)
  /portal/auto-cadastro  → AutoCadastroPage (público)
  /portal                → PortalAuthProvider > PortalProtectedRoute > PortalLayout
     ├─ /                → PortalDashboardPage
     ├─ /contato         → ContatoPage
     ├─ /repertorio      → RepertorioPage
     ├─ /ocorrencias     → OcorrenciasPage
     └─ /solicitacoes    → SolicitacoesPage
  ```
- [ ] 13.9 Garantir que o `AuthProvider` OIDC no `App.tsx` **não** envolve as rotas `/portal/*` (ou que o `PortalAuthProvider` sobrescreva o contexto para `/portal/*`). Adicionar link "Portal do Titular" discreto na tela de login OIDC e vice-versa.

## Sequenciamento

- Bloqueado por: 5.0 (endpoints de login/auto-cadastro do titular devem existir)
- Desbloqueia: 14.0, 15.0 (páginas consomem a infra)
- Paralelizável: Não (tarefa fundacional do frontend)

## Detalhes de Implementação

**Refator do `authenticatedFetch` (impacto médio — 7 arquivos):** a função atual mantém um provider singleton a nível de módulo. A refatoração:

```typescript
export function createAuthenticatedFetchClient(tokenProvider?: TokenProvider) {
  const getProvider = tokenProvider ?? (() => singletonProvider?.() ?? null);
  // ... resto igual, usando getProvider() em vez da variável direta
}
```

Os clients OIDC existentes chamam `createAuthenticatedFetchClient()` sem argumento → comportamento inalterado. O `portalClient` passa seu próprio `tokenProvider`. Validar que não há regressão nos 7 clients (testar uma chamada autenticada OIDC após a refator).

**Isolamento de contexto:** o `PortalAuthProvider` cria um `PortalAuthContext` distinto do `AuthContext` OIDC. As rotas `/portal/*` ficam fora da árvore `AuthProvider`/`AppProviders` OIDC ou sobrescrevem o contexto. A abordagem mais limpa é tornar `/portal/*` uma rota top-level que renderiza `<PortalAuthProvider><PortalLayout/></PortalAuthProvider>` sem o `<AuthProvider>` OIDC envolvendo.

**Token storage:** sessionStorage (limpo ao fechar aba) é mais seguro que localStorage para um token de 60min. Considerar expiração no cliente (redirect para login quando o token expira e a API retorna 401).

## Critérios de Sucesso

- O fluxo OIDC interno (`/`) continua funcionando sem regressão (login, chamadas autenticadas).
- As rotas `/portal/*` são acessíveis sem estar autenticado no OIDC.
- `PortalAuthProvider` gerencia o token do titular independentemente.
- `portalClient` injeta `Authorization: Bearer <token-titular>` nas chamadas `/portal/*`.
- O `PortalLayout` é visualmente distinto da área interna (sem Sidebar de domínios).
- `npm run build` (com type-check) passa sem erros.
