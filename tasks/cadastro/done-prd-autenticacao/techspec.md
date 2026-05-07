# Tech Spec — Autenticação e Autorização (Backend)

> **PRD:** `tasks/prd-autenticacao/prd.md`
> **Referência:** `docs/architecture/auth-plan.md`
> **Data:** 2026-04-01

---

## Resumo Executivo

Implementação da autenticação JWT Bearer e autorização por policies no cadastro-api. Feature de **modificação retroativa**: adicionar middleware de autenticação no Program.cs, policies `read`/`write`, e `.RequireAuthorization()` em TODOS os endpoints existentes (6 arquivos de endpoints). Também implementar custom claim mapping para `realm_access.roles` do Keycloak e flag `AUTH_ENABLED` para modo dev.

## Design de Implementação

### Claim Mapping (Keycloak → .NET)

Keycloak emite roles no claim `realm_access.roles` como JSON array. O .NET espera roles no claim `http://schemas.microsoft.com/ws/2008/06/identity/claims/role`. Necessário um `ClaimsTransformation`:

```csharp
// 1-Services/Cadastro.API/Infrastructure/KeycloakClaimsTransformation.cs
public class KeycloakClaimsTransformation : IClaimsTransformation
{
    public Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal)
    {
        var identity = (ClaimsIdentity)principal.Identity!;
        var realmAccess = principal.FindFirst("realm_access")?.Value;
        if (realmAccess != null)
        {
            var parsed = JsonDocument.Parse(realmAccess);
            if (parsed.RootElement.TryGetProperty("roles", out var roles))
            {
                foreach (var role in roles.EnumerateArray())
                {
                    identity.AddClaim(new Claim(ClaimTypes.Role, role.GetString()!));
                }
            }
        }
        return Task.FromResult(principal);
    }
}
```

### Program.cs — Configuração Completa

```csharp
var authEnabled = Environment.GetEnvironmentVariable("AUTH_ENABLED") != "false";

if (authEnabled)
{
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.Authority = Environment.GetEnvironmentVariable("OIDC_AUTHORITY");
            options.Audience = Environment.GetEnvironmentVariable("OIDC_AUDIENCE") ?? "mcad-frontend";
            options.RequireHttpsMetadata = false; // dev
        });

    builder.Services.AddTransient<IClaimsTransformation, KeycloakClaimsTransformation>();

    builder.Services.AddAuthorization(options =>
    {
        options.AddPolicy("write", policy => policy.RequireRole("analista-cadastro"));
        options.AddPolicy("read", policy => policy.RequireRole("analista-cadastro", "consultor"));
    });
}
else
{
    builder.Logging.AddConsole();
    // WARNING logged at startup
}

// Middleware
if (authEnabled)
{
    app.UseAuthentication();
    app.UseAuthorization();
}
```

### Proteção dos Endpoints Existentes

Cada arquivo de endpoints recebe `.RequireAuthorization()`:

```csharp
// Padrão para todos os endpoints:

// GET → "read"
group.MapGet("/", ListarTitulares).RequireAuthorization("read");
group.MapGet("/{id:guid}", BuscarPorId).RequireAuthorization("read");

// POST/PUT/DELETE → "write"
group.MapPost("/", CriarTitular).RequireAuthorization("write");
group.MapPut("/{id:guid}", AtualizarTitular).RequireAuthorization("write");
group.MapDelete("/{id:guid}", ExcluirTitular).RequireAuthorization("write");

// Health check → público
app.MapHealthChecks("/health"); // sem RequireAuthorization
```

### Mapeamento Endpoints → Policies

| Arquivo | GETs (read) | POST/PUT/DELETE (write) | Público |
|---------|-------------|------------------------|---------|
| AssociacaoEndpoints.cs | 2 (list, byId) | 0 (405 blocked) | — |
| TitularEndpoints.cs | 2 (list, byId) + 1 (busca) | 3 (criar, atualizar, excluir) | — |
| ObraEndpoints.cs | 2 (list, byId) | 5 (criar, atualizar, excluir, iswc, depurar, dp) | — |
| TitularidadeEndpoints.cs | 1 (listar) + 1 (busca) | 3 (adicionar, editar, remover) | — |
| FonogramaEndpoints.cs | 3 (list, byId, porObra) | 4 (criar, atualizar, excluir, depurar) | — |
| ParticipacaoEndpoints.cs | 1 (listar) | 4 (adicionar, ajustar, remover, calcular) | — |
| StatusEndpoints.cs | 2 (histórico obra, fono) | 6 (liberar/bloquear/desbloquear × 2) | — |
| Health check | — | — | `/health` |

### CORS Update

Adicionar `Authorization` aos headers permitidos:

```csharp
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()  // já permite Authorization
              .AllowAnyMethod()));
```

---

## Inventário de Artefatos

### Arquivos a Criar

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| `1-Services/Cadastro.API/Infrastructure/KeycloakClaimsTransformation.cs` | Service | Mapeia realm_access.roles → ClaimTypes.Role |

### Arquivos a Modificar

| Caminho | Alteração |
|---------|-----------|
| `1-Services/Cadastro.API/Program.cs` | +Authentication, +Authorization, +ClaimsTransformation, +AUTH_ENABLED flag, +UseAuthentication/UseAuthorization |
| `1-Services/Cadastro.API/Endpoints/AssociacaoEndpoints.cs` | +RequireAuthorization("read") nos GETs |
| `1-Services/Cadastro.API/Endpoints/TitularEndpoints.cs` | +RequireAuthorization("read"/"write") |
| `1-Services/Cadastro.API/Endpoints/ObraEndpoints.cs` | +RequireAuthorization("read"/"write") |
| `1-Services/Cadastro.API/Endpoints/TitularidadeEndpoints.cs` | +RequireAuthorization("read"/"write") |
| `1-Services/Cadastro.API/Endpoints/FonogramaEndpoints.cs` | +RequireAuthorization("read"/"write") |
| `1-Services/Cadastro.API/Endpoints/ParticipacaoEndpoints.cs` | +RequireAuthorization("read"/"write") |
| `1-Services/Cadastro.API/Endpoints/StatusEndpoints.cs` | +RequireAuthorization("read"/"write") |
| `services/cadastro-api/.env.example` | +OIDC_AUTHORITY, +OIDC_AUDIENCE, +AUTH_ENABLED |

### Pacotes NuGet

| Pacote | Projeto |
|--------|---------|
| `Microsoft.AspNetCore.Authentication.JwtBearer` | API |

---

## Testes

### Unitários

| Cenário | Descrição |
|---------|-----------|
| KeycloakClaimsTransformation com realm_access | Extrai roles corretamente |
| KeycloakClaimsTransformation sem realm_access | Não falha (graceful) |

### Integração

| Cenário | Status |
|---------|--------|
| GET sem token → 401 | Unauthorized |
| GET com token role consultor → 200 | OK |
| POST com token role consultor → 403 | Forbidden |
| POST com token role analista-cadastro → 201 | Created |
| GET /health sem token → 200 | Público |
| AUTH_ENABLED=false → endpoints sem auth | OK |

---

*Tech Spec Backend gerada.*
