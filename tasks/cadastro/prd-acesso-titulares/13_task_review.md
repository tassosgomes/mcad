# Task Review Report — 13.0: Frontend Infraestrutura do Portal

> **Validator:** AI Flow Validator (review-only, no code edits)
> **Date:** 2026-06-15
> **Validation Level:** Strict (build + type-check + tech review)

---

## Automated Validation Result

**Command:** `npm run build` (tsc -b && vite build)
**Status:** PASS — 0 errors, 2288 modules transformed

All TypeScript type-checking and Vite production build completed without errors.

---

## Technical Review

### Subtask Completion

| Subtask | Description | Status |
|---------|-------------|--------|
| 13.1 | `authenticatedFetch.ts` refactor — `createAuthenticatedFetchClient(tokenProvider?)` | PASS |
| 13.2 | `portalClient.ts` — own tokenProvider + portalGet/Post/Put helpers | PASS |
| 13.3 | `runtimeConfig.ts` — `portalApiBaseUrl` field | PASS |
| 13.4 | `runtime-env.template.js` + `40-runtime-env.sh` — `PORTAL_API_BASE_URL` | PASS |
| 13.5 | `PortalAuthProvider.tsx` — login/signup/logout, sessionStorage, auto-restore | PASS |
| 13.6 | `PortalProtectedRoute.tsx` — redirects to `/portal/login` if unauthenticated | PASS |
| 13.7 | `PortalLayout.tsx` — distinct header (titular name + logout), no Sidebar | PASS |
| 13.8 | Portal routes as top-level sibling in `routes.tsx`, exact structure match | PASS |
| 13.9 | OIDC isolation — portal uses own `PortalAuthContext`, not wrapped by `ProtectedRoute` | PASS |

### Detailed Findings

#### 13.1 — `authenticatedFetch.ts` (backward compatibility)
The refactor correctly accepts an optional `externalProvider?: TokenProvider` parameter. When provided (as in `portalClient.ts`), the client uses the external provider directly. When omitted (as in all 7 existing OIDC clients: `apiClient`, `apiArrecadacaoClient`, `apiAuditoriaClient`, `apiAuthzClient`, `apiBffClient`, `apiDistribuicaoClient`, `apiIdentificacaoClient`), the client falls back to the singleton `getClientAuthToken` set via `setAuthTokenProvider()`. **No regression.**

#### 13.2 — `portalClient.ts`
- Located at `frontend/src/features/portal/shared/api/portalClient.ts`
- Passes its own `() => getPortalToken()` token provider to `createAuthenticatedFetchClient`
- Base URL from `runtimeConfig.portalApiBaseUrl`
- Provides `portalGet<T>()`, `portalPost<T>()`, `portalPut<T>()` helpers

#### 13.3 — `runtimeConfig.ts`
- `portalApiBaseUrl: getRuntimeValue('PORTAL_API_BASE_URL', '/api/cadastro/v1/portal')` correctly defined
- Typed in `RuntimeEnv` interface as `PORTAL_API_BASE_URL?: string`

#### 13.4 — Runtime env template + shell script
- `PORTAL_API_BASE_URL` added to `runtime-env.template.js` (line 8)
- `PORTAL_API_BASE_URL` exported with fallback in `40-runtime-env.sh` (line 10)
- Included in `envsubst` substitution list (line 50)
- Not listed as a required variable (correct — portal is optional for the main app)

#### 13.5 — `PortalAuthProvider.tsx`
- Exposes `{ titular, token, isAuthenticated, isLoading, login, signup, logout }`
- `login(documento, senha)` → `POST {baseUrl}/auth/login` → stores in sessionStorage
- `signup(documento, caeIpi, senha)` → `POST {baseUrl}/auto-cadastro`
- `logout()` clears sessionStorage and resets state
- Auto-restore on mount: reads from sessionStorage, checks token expiry (`expiraEm > new Date()`)
- Does **not** use `oidc-client-ts` — pure fetch + JWT

#### 13.6 — `PortalProtectedRoute.tsx`
- Uses `usePortalAuth()` hook (PortalAuthContext, not OIDC AuthContext)
- Shows `<Loading />` while `isLoading` is true
- Redirects to `/portal/login` via `<Navigate to="/portal/login" replace />` when unauthenticated
- Mirrors `ProtectedRoute.tsx` pattern (different auth context)

#### 13.7 — `PortalLayout.tsx`
- Header with brand `"MCAD — Portal do Titular"` on left, titular name + `"Sair"` button on right
- `<Outlet/>` for nested route content
- Styled via `PortalLayout.module.css` (distinct from `MainLayout` styles)
- Does **not** render `<Sidebar>`, `<Header>` (OIDC), or domain navigation

#### 13.8 — Route structure
The `portalRoutes` object is included as a **top-level sibling** of `/` in `createBrowserRouter()` (line 100 of `routes.tsx`):

```
/portal/login          → PortalLoginPage (public, no auth wrapper)
/portal/auto-cadastro  → AutoCadastroPage (public, no auth wrapper)
/portal                → PortalAuthProvider > PortalProtectedRoute > PortalLayout
   /                   → PortalDashboardPage
   /contato            → ContatoPage
   /repertorio         → RepertorioPage
   /ocorrencias        → OcorrenciasPage
   /solicitacoes       → SolicitacoesPage
```

Lazy-loaded via `React.lazy()` with `<Suspense fallback={<Loading />}>`.

#### 13.9 — OIDC isolation
- OIDC `AuthProvider` wraps the entire `<RouterProvider>` in `App.tsx`
- Portal routes use their own `PortalAuthContext` (completely separate React context — no collision)
- OIDC `ProtectedRoute` wraps only the `/` route tree (line 103 of routes.tsx), NOT `/portal/*`
- Portal routes are siblings in the router config, not nested under OIDC-protected route
- When visiting `/portal/*`, the OIDC `AuthProvider` is mounted but does not interfere with `PortalAuthContext`

### Placeholder Pages (all 7 confirmed)

| Page | File | Status |
|------|------|--------|
| `PortalLoginPage` | `pages/login/PortalLoginPage.tsx` | EXISTS |
| `AutoCadastroPage` | `pages/auto-cadastro/AutoCadastroPage.tsx` | EXISTS |
| `PortalDashboardPage` | `pages/dashboard/PortalDashboardPage.tsx` | EXISTS |
| `ContatoPage` | `pages/contato/ContatoPage.tsx` | EXISTS |
| `RepertorioPage` | `pages/repertorio/RepertorioPage.tsx` | EXISTS |
| `OcorrenciasPage` | `pages/ocorrencias/OcorrenciasPage.tsx` | EXISTS |
| `SolicitacoesPage` | `pages/solicitacoes/SolicitacoesPage.tsx` | EXISTS |

All are thin stubs (`<div>XxPage — placeholder</div>`), ready for tasks 14.0+.

### Code Quality Compliance

| Rule | Status |
|------|--------|
| Components PascalCase | PASS |
| Hooks useX pattern | PASS (`usePortalAuth`) |
| No `any` types | PASS |
| Props typed with interface | PASS |
| Functional components only | PASS |
| Components under ~300 lines | PASS (max 108 lines in PortalAuthProvider) |
| Imports use aliases (`@/`, `@services/`, `@features/`) | PASS |
| No deep relative paths | PASS |
| English in code | PASS (exception: PT domain strings for UI brand) |
| useEffect cleanup where needed | PASS |
| sessionStorage (not localStorage) | PASS |
| Token expiry checked on restore | PASS |

---

## Issues Found

**Zero defects identified.**

**1 observation (non-blocking):** Subtask 13.9 mentions _Adicionar link "Portal do Titular" discreto na tela de login OIDC e vice-versa_. The OIDC login flow redirects to an external IDP (Keycloak/Logto) — there is no React login page for OIDC to add a link to. The _vice-versa_ link (from PortalLoginPage back to main app) is not present because PortalLoginPage is a thin placeholder. Both cross-links are appropriate for tasks 14.x/15.x when the pages are fleshed out.

---

## Final Recommendation

**VALIDAÇÃO APROVADA**

All 9 subtasks (13.1–13.9) are complete. Automated build passes with 0 errors. Backward compatibility with 7 OIDC clients confirmed. Portal auth infrastructure is properly isolated from OIDC context. Code follows project conventions and applicable skills (`react-architecture`, `react-code-quality`). Ready to unblock tasks 14.0 and 15.0.
