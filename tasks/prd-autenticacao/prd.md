# PRD — Autenticação e Autorização (Cross-Cutting)

> **Tipo:** Feature Transversal
> **Prioridade:** Must Have
> **Status:** `planned`
> **Data:** 2026-04-01
> **Referência:** `docs/architecture/auth-plan.md`

---

## Visão Geral

Autenticação e Autorização é a feature transversal que protege todos os endpoints do mini-ECAD e controla o acesso por perfil (Analista de Cadastro vs Consultor). O Keycloak externo atua como IDP centralizado, o frontend autentica via **Authorization Code Flow com PKCE** usando `oidc-client-ts` (agnóstico), e o backend valida **JWT Bearer tokens** via JWKS.

Esta feature é **retroativa** — aplicada aos endpoints e telas já existentes de F01-F08 sem alterar a lógica de negócio.

---

## Objetivos

| Objetivo | Métrica de Sucesso |
|----------|-------------------|
| Todos os endpoints protegidos | Zero endpoints acessíveis sem token válido |
| Analista pode ler e escrever | 100% dos endpoints POST/PUT/DELETE acessíveis com role `analista-cadastro` |
| Consultor apenas lê | 100% dos endpoints GET acessíveis; 100% dos POST/PUT/DELETE retornam 403 |
| Frontend agnóstico ao IDP | Zero imports de `keycloak-js`; apenas `oidc-client-ts` |
| Token expirado retorna 401 | 100% dos endpoints retornam 401 para token expirado |

---

## Histórias de Usuário

### HU-01 — Login no sistema
**Como** Analista de Cadastro ou Consultor,
**eu quero** fazer login via Keycloak usando meu usuário e senha,
**para que** eu acesse o sistema com meu perfil correto.

### HU-02 — Acesso restrito por perfil
**Como** sistema,
**eu preciso** impedir que Consultor execute ações de escrita (criar, editar, excluir),
**para que** apenas Analistas autorizados modifiquem dados do Cadastro.

### HU-03 — Logout
**Como** usuário autenticado,
**eu quero** fazer logout e ser redirecionado ao Keycloak,
**para que** minha sessão seja encerrada em todos os serviços.

### HU-04 — Renovação silenciosa de token
**Como** usuário autenticado,
**eu quero** que meu token seja renovado automaticamente antes de expirar,
**para que** eu não seja desconectado no meio de uma operação.

### HU-05 — UI adaptada ao perfil
**Como** Consultor,
**eu quero** que botões de ação (criar, editar, excluir, liberar, bloquear) não apareçam na interface,
**para que** eu não tente operações que serão negadas pelo backend.

---

## Funcionalidades Principais

### 1. Backend — Autenticação JWT

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-01 | Configurar `JwtBearer` authentication no Program.cs com Authority e Audience do Keycloak | Must Have |
| RF-02 | Validar assinatura do JWT via JWKS do Keycloak (sem validar manualmente — delegado ao middleware) | Must Have |
| RF-03 | Extrair roles do claim `realm_access.roles` do JWT e mapear para `ClaimsPrincipal` | Must Have |
| RF-04 | Token ausente ou inválido → retornar 401 Unauthorized | Must Have |
| RF-05 | Token válido mas sem role necessária → retornar 403 Forbidden | Must Have |
| RF-06 | Variáveis via .env: `OIDC_AUTHORITY`, `OIDC_AUDIENCE` | Must Have |

### 2. Backend — Autorização por Policy

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-07 | Policy `write`: requer role `analista-cadastro` | Must Have |
| RF-08 | Policy `read`: requer role `analista-cadastro` OU `consultor` | Must Have |
| RF-09 | Endpoints GET (listagem, busca, autocomplete, histórico): RequireAuthorization("read") | Must Have |
| RF-10 | Endpoints POST/PUT/DELETE (CRUD, liberar, bloquear, depurar, ISWC, DP): RequireAuthorization("write") | Must Have |
| RF-11 | Health check (`/health`) permanece público (sem auth) | Must Have |

**Critérios de Aceitação — RF-10:**
- **Given** token com role `consultor`
- **When** POST /api/v1/titulares (criar titular)
- **Then** retorna 403 Forbidden

**Critérios de Aceitação — RF-09:**
- **Given** token com role `consultor`
- **When** GET /api/v1/titulares (listar titulares)
- **Then** retorna 200 OK com dados

### 3. Backend — Modo Dev (sem auth)

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-12 | Flag `AUTH_ENABLED` no .env (default `true`). Se `false`, endpoints funcionam sem token (modo desenvolvimento) | Should Have |
| RF-13 | Quando AUTH_ENABLED=false, logar warning no startup: "Authentication is DISABLED" | Should Have |

### 4. Frontend — Autenticação OIDC

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-14 | Integrar `oidc-client-ts` com configuração via env vars (VITE_OIDC_AUTHORITY, CLIENT_ID, REDIRECT_URI) | Must Have |
| RF-15 | AuthProvider wrapping a aplicação com UserManager do oidc-client-ts | Must Have |
| RF-16 | Ao acessar qualquer rota sem estar autenticado, redirecionar para login do Keycloak (PKCE) | Must Have |
| RF-17 | CallbackPage processa o retorno do Keycloak e redireciona para a rota original | Must Have |
| RF-18 | Tokens armazenados in-memory (não localStorage/sessionStorage) | Must Have |
| RF-19 | Silent refresh automático via iframe (`automaticSilentRenew: true`) | Must Have |
| RF-20 | Botão de logout no Header que redireciona ao endpoint de logout do Keycloak | Must Have |

**Critérios de Aceitação — RF-16:**
- **Given** usuário não autenticado acessa `/cadastro/titulares`
- **When** a rota é carregada
- **Then** é redirecionado para o login do Keycloak
- **And** após login, retorna para `/cadastro/titulares`

### 5. Frontend — Autorização por Role

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-21 | Hook `useAuth()` expõe: `user`, `isAuthenticated`, `roles`, `hasRole(role)`, `login()`, `logout()`, `token` | Must Have |
| RF-22 | Componente `ProtectedRoute` que verifica role antes de renderizar | Must Have |
| RF-23 | Botões de ação (criar, editar, excluir, liberar, bloquear, depurar) ocultos para role `consultor` | Must Have |
| RF-24 | PageHeader.action condicional: Analista vê botões, Consultor não | Must Have |
| RF-25 | API client (`apiClient.ts`) adiciona `Authorization: Bearer {token}` em todos os requests | Must Have |

**Critérios de Aceitação — RF-23:**
- **Given** usuário com role `consultor`
- **When** acessa `/cadastro/titulares`
- **Then** a listagem exibe dados mas NÃO mostra botão "Novo Titular" nem ações de editar/excluir

### 6. Frontend — Integração Agnóstica

| # | Requisito | MoSCoW |
|---|-----------|--------|
| RF-26 | Nenhum import de `keycloak-js` ou SDK específico do Keycloak | Must Have |
| RF-27 | Toda configuração OIDC via .env (zero URLs hardcoded) | Must Have |
| RF-28 | Claims extraídas via padrão OIDC (não estrutura específica do Keycloak) | Must Have |

---

## Experiência do Usuário

### Fluxo — Primeiro Acesso
1. Usuário acessa `http://localhost:5173`
2. Não autenticado → redireciona para Keycloak login
3. Informa credenciais no Keycloak
4. Keycloak redireciona para `/callback` com authorization code
5. SPA troca code por token (PKCE)
6. Token armazenado in-memory → redireciona para rota original
7. Interface carrega com botões adaptados ao perfil

### Fluxo — Renovação Silenciosa
1. Token próximo de expirar
2. oidc-client-ts abre iframe invisível para Keycloak
3. Novo token obtido silenciosamente
4. Nenhuma interrupção para o usuário

### Fluxo — Logout
1. Usuário clica "Sair" no Header
2. SPA limpa tokens in-memory
3. Redireciona para endpoint de logout do Keycloak
4. Keycloak invalida sessão → redireciona para página de login

### Considerações de UI
- Botão "Sair" no Header (ao lado do nome do usuário)
- Nome do usuário exibido no Header (extraído do token)
- Badge com role (ex: "Analista" ou "Consultor") no Header
- Loading spinner durante autenticação (antes do redirect callback)

---

## Restrições Técnicas de Alto Nível

- Keycloak externo (já existente, não Docker Compose)
- `oidc-client-ts` no frontend (agnóstico ao IDP)
- `Microsoft.AspNetCore.Authentication.JwtBearer` no backend
- Tokens in-memory (não localStorage) por segurança
- Realm roles (não client roles) no claim `realm_access.roles`
- CORS configurado para permitir Authorization header

---

## Não-Objetivos (Fora de Escopo)

- Não configura o Keycloak (realm, client, roles são configurados manualmente pelo admin)
- Não implementa autorização granular (ex: Analista X só edita titulares da sua associação)
- Não implementa multi-tenancy
- Não implementa API keys (apenas JWT)
- Não implementa rate limiting
- Não implementa refresh token rotation (oidc-client-ts gerencia)
- Não implementa propagação de token cross-service (será na Fase 2 quando houver múltiplos serviços)

---

## Rastreabilidade

### Vision Doc
- **Restrição técnica:** Keycloak externo, JWT, Authorization Code PKCE
- **Perfis:** Analista de Cadastro (leitura+escrita), Consultor (leitura)

### auth-plan.md
- Decisão arquitetural completa documentada em `docs/architecture/auth-plan.md`

---

## Questões em Aberto

Todas as questões foram resolvidas no auth-plan.md. PRD pronto.

---

*PRD gerado. Para Tech Specs, use `techspec-creator`.*
