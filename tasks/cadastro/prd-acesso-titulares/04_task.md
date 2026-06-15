---
status: pending
parallelizable: false
blocked_by: ["2.0"]
---

<task_context>
<domain>cadastro/application,infra</domain>
<type>implementation</type>
<scope>middleware</scope>
<complexity>high</complexity>
<dependencies>http_server</dependencies>
<unblocks>"5.0"</unblocks>
</task_context>

# Tarefa 4.0: Infraestrutura de Autenticação do Titular

## Visão Geral

Implementar a base de autenticação interna do Portal do Titular: o serviço `ITitularTokenService` (JWT HMAC-SHA256), o scheme de autenticação "Titular" no `Program.cs`, o abstrator `ICurrentTitular` e a exceção `AutenticacaoTitularException` (→ HTTP 401 genérico). Esta tarefa **não** cria os endpoints de login/auto-cadastro (tarefa 5.0) — apenas a infraestrutura que eles consomem.

## Requisitos

- RF-05, RF-06 (autenticação com mensagem genérica)
- Tech Spec — seção *Configuração de Autenticação (Program.cs)* e *Interfaces Principais*

## Subtarefas

- [ ] 4.1 Criar `2-Application/Cadastro.Application/Titulares/Services/ITitularTokenService.cs` — interface com `string Gerar(Titular titular)`.
- [ ] 4.2 Criar `4-Infra/Cadastro.Infra/Services/TitularTokenService.cs` — implementação que gera JWT HMAC-SHA256 com `issuer = "cadastro-api-portal"`, `sub = titular.Id.ToString()`, claim `nome`, `expiraEm = 60min`. Lê o secret da env var `PORTAL_JWT_SECRET` (lança `InvalidOperationException` se ausente ou < 32 bytes). Adicionar pacote `BCrypt.Net-Next` ao projeto Application ou Infra (para uso na tarefa 5.0).
- [ ] 4.3 Criar `1-Services/Cadastro.API/Authorization/ICurrentTitular.cs` — interface com `Guid TitularId { get; }` e `bool IsAutenticado { get; }`. Espelha `ICurrentUserPermissions` (lê claim `sub` do `HttpContext` sob o scheme "Titular").
- [ ] 4.4 Criar `1-Services/Cadastro.API/Authorization/HttpContextCurrentTitular.cs` — implementação que extrai `HttpContextAccessor.HttpContext.User.FindFirst("sub")`. Registrar `IHttpContextAccessor` no DI.
- [ ] 4.5 Criar `2-Application/Cadastro.Application/Common/Exceptions/AutenticacaoTitularException.cs` — exceção simples (mensagem genérica "Credenciais inválidas"). Mapear a HTTP 401 no `GlobalExceptionHandler` (subtarefa 4.7).
- [ ] 4.6 Configurar o scheme "Titular" no `Program.cs`:
  - Manter o scheme JWT/Keycloak existente como **default**.
  - Adicionar `.AddJwtBearer("Titular", options => { ... })` com `IssuerSigningKey = SymmetricSecurityKey(PORTAL_JWT_SECRET)`, `ValidIssuer = "cadastro-api-portal"`, `ValidateAudience = false`, `ClockSkew = 1min`.
  - Adicionar policy `AddPolicy("PortalTitular", p => p.RequireAuthenticatedUser().AddAuthenticationSchemes("Titular"))`.
  - Preservar `DefaultPolicy` e `FallbackPolicy` existentes (regressão: endpoints internos continuam exigindo Keycloak).
  - Registrar `ITitularTokenService`, `ICurrentTitular` (Scoped) no DI.
- [ ] 4.7 Atualizar `1-Services/Cadastro.API/Infrastructure/GlobalExceptionHandler.cs` — mapear `AutenticacaoTitularException` → 401 (ProblemDetails RFC 7807) com mensagem genérica. Nunca revelar se foi CPF ou senha.
- [ ] 4.8 Adicionar `PORTAL_JWT_SECRET` ao `.env.example`, `docker-compose.dev.yml` e ao script `frontend/docker/40-runtime-env.sh` (apenas a validação backend — o frontend não usa o secret).
- [ ] 4.9 Testes unitários:
  - `TitularTokenServiceTests.cs` — token gerado tem `sub = titularId`, `issuer` correto, `exp` ≈ 60min; lança se secret < 32 bytes.
  - `GlobalExceptionHandler` mapeia `AutenticacaoTitularException` → 401 (verificar em teste de integração da 5.0).

## Sequenciamento

- Bloqueado por: 2.0 (entidade `CredencialTitular` e `Titular` para claims)
- Desbloqueia: 5.0
- Paralelizável: Não (wiring central do `Program.cs`)

## Detalhes de Implementação

**Configuração do scheme** (Program.cs — adicionar em cadeia ao existente):

```csharp
var portalSecret = Environment.GetEnvironmentVariable("PORTAL_JWT_SECRET")
    ?? throw new InvalidOperationException("PORTAL_JWT_SECRET é obrigatório (≥32 bytes).");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options => { /* existente — Logto/OIDC, manter intacto */ })
    .AddJwtBearer("Titular", options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true, ValidIssuer = "cadastro-api-portal",
            ValidateAudience = false,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(portalSecret)),
            ValidateIssuerSigningKey = true, ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.DefaultPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser().Build();
    options.FallbackPolicy = options.DefaultPolicy;
    options.AddPolicy("PortalTitular", p => p
        .RequireAuthenticatedUser().AddAuthenticationSchemes("Titular").Build());
});
```

> **Cuidado de regressão:** o `AddAuthentication` encadeado sobrescreve a config default. Certificar que o scheme Keycloak permanece como `AuthenticationScheme` default e que `FallbackPolicy = RequireAuthenticatedUser()` continua ativo. Validar com um teste de integração que um endpoint interno sem token continua retornando 401.

**Pacote BCrypt:** `dotnet add 2-Application/Cadastro.Application/Cadastro.Application.csproj package BCrypt.Net-Next` (work factor 12). O hash contém o salt embutido — não há coluna separada.

## Critérios de Sucesso

- O scheme "Titular" valida tokens assinados com `PORTAL_JWT_SECRET` e rejeita tokens com secret errado/expirados.
- Endpoints internos (ex: `GET /api/v1/titulares`) continuam exigindo o token Keycloak (sem regressão).
- `AutenticacaoTitularException` → HTTP 401 com mensagem "Credenciais inválidas" (genérica).
- `PORTAL_JWT_SECRET` é validado fail-fast no startup se ausente/curto.
- `dotnet build` e `dotnet test 5-Tests/Cadastro.UnitTests` passam.
