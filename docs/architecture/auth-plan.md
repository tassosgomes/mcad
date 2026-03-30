# Plano de Autenticação e Autorização — mini-ECAD

> **Tipo:** Decisão Arquitetural Cross-Cutting
> **Status:** Planejado
> **Data:** 2026-03-30
> **Aplicação:** Retroativa — será aplicada a todos os serviços após implementação

---

## 1. Decisão

Adotar **Keycloak** como Identity Provider (IDP) centralizado para autenticação e autorização de todos os microsserviços do mini-ECAD. O frontend (SPA React) autentica via **Authorization Code Flow com PKCE**, e os serviços backend validam **JWT Bearer tokens** emitidos pelo Keycloak.

## 2. Contexto

O mini-ECAD é composto por múltiplos microsserviços (.NET 8, Java) e um frontend SPA (React). O Domain Doc do Cadastro define dois perfis:

- **Analista de Cadastro** — leitura e escrita
- **Consultor** — somente leitura

Sem um IDP centralizado, cada serviço precisaria gerenciar autenticação de forma independente, criando inconsistência e impedindo auditoria cross-service.

## 3. Arquitetura

```
┌─────────────┐         ┌──────────────┐
│  Frontend   │──PKCE──→│   Keycloak   │
│  React SPA  │←─token──│   (externo)  │
└──────┬──────┘         └──────┬───────┘
       │ Bearer token          │ JWKS
       ▼                       ▼
┌──────────────┐     ┌──────────────┐
│ cadastro-api │     │ outros APIs  │
│   (.NET 8)   │     │ (Java/NET)   │
└──────────────┘     └──────────────┘
       │                      │
       └──── propagação do token do usuário ────┘
             (chamadas cross-service)
```

### Fluxo Resumido

1. **Usuário acessa o SPA** → redirecionado ao Keycloak para login (Authorization Code + PKCE)
2. **Keycloak autentica** → retorna `access_token` (JWT) + `refresh_token`
3. **SPA armazena tokens** → via `oidc-client-ts` (in-memory, não localStorage)
4. **SPA envia requests** → com header `Authorization: Bearer <access_token>`
5. **Backend valida JWT** → verifica assinatura via JWKS do Keycloak, extrai roles do token
6. **Chamadas cross-service** → propagam o token do usuário original (não client credentials)

## 4. Componentes

### 4.1 Keycloak (Externo — já existente)

Configuração necessária no Keycloak:

| Recurso | Configuração |
|---------|-------------|
| **Realm** | `mcad` (ou realm existente) |
| **Client (SPA)** | `mcad-frontend` — public client, PKCE habilitado, redirect URIs: `http://localhost:5173/*` |
| **Client (service)** | Não necessário — serviços validam JWT via JWKS, sem client credentials |
| **Realm Roles** | `analista-cadastro`, `consultor` |
| **Role Mapping** | Roles no claim `realm_access.roles` do JWT |

> **Nota:** Roles de domínios futuros (Identificação, Arrecadação, Distribuição) serão criadas quando esses domínios forem implementados.

### 4.2 Frontend (React SPA)

| Decisão | Detalhe |
|---------|---------|
| **Biblioteca** | `oidc-client-ts` — agnóstica, não acoplada a Keycloak |
| **Armazenamento de tokens** | In-memory (via `UserManager`) — não localStorage/sessionStorage |
| **Silent refresh** | Via iframe (`automaticSilentRenew: true`) |
| **Logout** | Redirect ao endpoint de logout do Keycloak |
| **Role-based UI** | Consultor não vê botões de ação (criar, editar, excluir); Analista vê tudo |

**Integração agnóstica — O frontend NÃO deve:**
- Importar `keycloak-js` ou qualquer SDK específico do Keycloak
- Referenciar URLs do Keycloak diretamente no código (apenas via config/env)
- Depender da estrutura específica do token do Keycloak (usar claims padrão OIDC)

**Configuração via .env:**
```env
VITE_OIDC_AUTHORITY=https://keycloak.example.com/realms/mcad
VITE_OIDC_CLIENT_ID=mcad-frontend
VITE_OIDC_REDIRECT_URI=http://localhost:5173/callback
VITE_OIDC_POST_LOGOUT_REDIRECT_URI=http://localhost:5173
```

**Estrutura de pastas:**
```
frontend/src/
  shared/
    auth/
      AuthProvider.tsx        ← Provider OIDC (wraps UserManager)
      AuthContext.tsx          ← Context com user, roles, isAuthenticated
      useAuth.ts              ← Hook: login, logout, token, hasRole()
      ProtectedRoute.tsx      ← Route guard por role
      CallbackPage.tsx        ← Processa redirect do Keycloak
      authConfig.ts           ← Configuração OIDC (lê do env)
      index.ts
```

### 4.3 Backend (.NET 8)

| Decisão | Detalhe |
|---------|---------|
| **Validação de JWT** | `Microsoft.AspNetCore.Authentication.JwtBearer` — valida via JWKS do Keycloak |
| **Extração de roles** | Claim `realm_access.roles` mapeada para `ClaimsPrincipal.IsInRole()` |
| **Autorização** | Policy-based: `RequireRole("analista-cadastro")` para escrita, endpoints de leitura abertos para ambos |
| **Propagação cross-service** | Token do usuário propagado via header `Authorization` em chamadas HTTP |

**Configuração via .env (adições):**
```env
OIDC_AUTHORITY=https://keycloak.example.com/realms/mcad
OIDC_AUDIENCE=mcad-frontend
```

**Program.cs (adições):**
```csharp
// Autenticação JWT
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = builder.Configuration["OIDC_AUTHORITY"];
        options.Audience = builder.Configuration["OIDC_AUDIENCE"];
        options.RequireHttpsMetadata = false; // dev only
    });

// Autorização por role
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("write", policy => policy.RequireRole("analista-cadastro"));
    options.AddPolicy("read", policy => policy.RequireRole("analista-cadastro", "consultor"));
});

// Middleware
app.UseAuthentication();
app.UseAuthorization();
```

**Proteção de endpoints:**
```csharp
// Endpoints de leitura — ambos os perfis
group.MapGet("/", ListarTitulares).RequireAuthorization("read");
group.MapGet("/{id:guid}", BuscarPorId).RequireAuthorization("read");

// Endpoints de escrita — apenas Analista
group.MapPost("/", CriarTitular).RequireAuthorization("write");
group.MapPut("/{id:guid}", AtualizarTitular).RequireAuthorization("write");
group.MapDelete("/{id:guid}", ExcluirTitular).RequireAuthorization("write");
```

### 4.4 Backend (Java — futuro)

Mesmo padrão: Spring Security com `spring-boot-starter-oauth2-resource-server`, validação via JWKS, mesmas policies de role. Será detalhado quando os domínios Java forem implementados.

## 5. Roles Iniciais

| Role Keycloak | Perfil no Domain Doc | Permissão | Domínios |
|---|---|---|---|
| `analista-cadastro` | Analista de Cadastro | Leitura + Escrita | Cadastro (D01) |
| `consultor` | Consultor | Somente Leitura | Cadastro (D01) |

> Roles para Identificação, Arrecadação e Distribuição serão adicionadas quando esses domínios forem implementados.

## 6. Propagação de Token (Cross-Service)

Quando o serviço de Identificação chamar o Cadastro para validar uma obra:

```
Identificação API ──GET /api/v1/obras/{id}──→ Cadastro API
                   Authorization: Bearer <token-do-usuario-original>
```

- O token do usuário é propagado (não substituído por client credentials)
- Isso permite auditoria: o Cadastro sabe QUEM originou a consulta
- O serviço chamador extrai o token do `HttpContext` e o repassa via `HttpClient`

**Implementação (.NET):**
```csharp
// DelegatingHandler que propaga o token
public class TokenPropagationHandler : DelegatingHandler
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var token = _httpContextAccessor.HttpContext?
            .Request.Headers.Authorization.ToString();
        if (!string.IsNullOrEmpty(token))
            request.Headers.Add("Authorization", token);

        return await base.SendAsync(request, cancellationToken);
    }
}
```

## 7. Estratégia de Implementação (Retroativa)

A auth será aplicada como uma feature transversal **após** as features de domínio estarem funcionais:

### Fase A — Infraestrutura Auth
1. Configurar realm/client/roles no Keycloak existente
2. Criar `shared/auth/` no frontend (Provider, Context, Hook, ProtectedRoute, CallbackPage)
3. Adicionar JWT validation no `Program.cs` do cadastro-api
4. Testar fluxo end-to-end: login → token → API protegida

### Fase B — Aplicar aos Endpoints Existentes
1. Proteger endpoints de escrita com policy `write` (POST, PUT, DELETE)
2. Proteger endpoints de leitura com policy `read` (GET)
3. Ajustar frontend: esconder botões de ação para Consultor
4. Adicionar `CallbackPage` no router

### Fase C — Validação
1. Testar: Consultor NÃO consegue criar/editar/excluir
2. Testar: Analista consegue tudo
3. Testar: Usuário sem role não acessa nada
4. Testar: Token expirado retorna 401

## 8. Impacto nos Documentos Existentes

| Documento | Alteração Necessária |
|-----------|---------------------|
| `vision.md` | Remover "Não implementará autenticação" dos Non-Goals; adicionar Keycloak nas restrições técnicas |
| `domains/cadastro/domain.md` | Sem alteração (perfis já definidos) |
| PRDs existentes (F01, F02) | Sem alteração (auth é retroativa, não muda requisitos funcionais) |
| `techspec.md` (F01) | Adicionar JWT validation na fase retroativa |
| `techspec-frontend.md` (F01) | Adicionar `shared/auth/` na fase retroativa |
| `.env.example` (backend + frontend) | Adicionar variáveis OIDC |

## 9. Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Keycloak externo indisponível bloqueia desenvolvimento local | Média | Alto | Documentar modo "dev sem auth" via flag de ambiente (`AUTH_ENABLED=false`) |
| Claim de roles em formato diferente do esperado | Baixa | Médio | Testar com token real do Keycloak antes de implementar; mapear claims no backend |
| Token propagado entre serviços pode expirar durante processamento longo | Baixa | Baixo | Aceitável para PoC; em produção, usar circuit breaker + retry |

---

*Plano de auth gerado como decisão arquitetural. Será implementado como feature transversal retroativa após as features de domínio estarem funcionais.*
