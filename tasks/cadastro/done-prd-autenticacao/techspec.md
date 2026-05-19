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

---

## Atualizacao de Implementacao — 2026-05-19

Esta secao descreve o backend como esta implementado hoje no codigo. O conteudo original acima permanece como historico da especificacao planejada.

### Arquitetura Implementada

| Componente | Estado no codigo |
|------------|------------------|
| API | `.NET 8` Minimal API em `services/cadastro-api/1-Services/Cadastro.API`. |
| Autenticacao | `Microsoft.AspNetCore.Authentication.JwtBearer` configurado em `Program.cs` quando `AUTH_ENABLED != false`. |
| OIDC | `OIDC_AUTHORITY` e obrigatorio com auth ligado; `OIDC_AUDIENCE` defaulta para `https://api.mcad.local`. |
| Claims | `LogtoClaimsTransformation` mapeia claim flat `roles` para `ClaimTypes.Role` e expande `scope` espaco-separado em claims individuais. |
| Autorizacao | `Ecad.Authz.AspNetCore`/`Ecad.Authz.Sdk` via `AddEcadAuthz(builder.Configuration)`. |
| Toggle dev | `AUTH_ENABLED=false` desabilita autenticacao/autorizacao fina, loga warning e faz `RequireCadastroPermission` aplicar `AllowAnonymous()`. |
| Publico | `/health` e publico; Swagger e AsyncAPI ficam antes da auth/explicitamente anonimos. |

### Fluxo de Autenticacao

1. `DotEnvLoader` carrega `.env` procurando a partir do diretorio atual e de `AppContext.BaseDirectory`, sem sobrescrever variaveis ja existentes.
2. Com `AUTH_ENABLED=true`, `Program.cs` registra `JwtBearerDefaults.AuthenticationScheme`.
3. O JWT e validado contra `Authority`, `Audience`, `ValidIssuer` e `ValidAudiences`; `MapInboundClaims=false`.
4. `LogtoClaimsTransformation` clona o principal antes de mutar, evitando concorrencia sobre `ClaimsPrincipal` cacheado.
5. `UseAuthentication()` roda antes de `UseAuthorization()`.

### Fluxo de Autorizacao Fina

A implementacao final substitui policies locais `read`/`write` por permissoes explicitas:

```csharp
builder.Services.AddEcadAuthz(builder.Configuration);
builder.Services.Configure<EcadAuthzOptions>(options => options.Enabled = authEnabled && options.Enabled);
```

Cada endpoint chama:

```csharp
.RequireCadastroPermission(CadastroPermissions.ObraCriar, authEnabled)
```

Quando `authEnabled=true`, a extensao delega para `RequirePermission(permission)` do SDK. Quando `authEnabled=false`, aplica `AllowAnonymous()`.

### Catalogo de Permissoes

O catalogo efetivo fica em `CadastroPermissions.cs` e possui 41 permissoes, tambem declaradas em `seeds/mcad/cadastro.permissions.json`.

| Grupo | Exemplos de permissoes |
|-------|------------------------|
| Associacao | `cadastro:default:associacao:listar`, `cadastro:default:associacao:visualizar` |
| Titular | `listar`, `visualizar`, `buscar`, `criar`, `editar`, `excluir` |
| Obra | `listar`, `visualizar`, `criar`, `editar`, `excluir`, `gerar-iswc`, `depurar`, `dp` |
| Titularidade | `listar`, `buscar`, `adicionar`, `editar`, `remover` |
| Fonograma | `listar`, `visualizar`, `listar-por-obra`, `criar`, `editar`, `excluir`, `depurar` |
| Participacao | `listar`, `adicionar`, `ajustar`, `remover`, `calcular` |
| Status | historico, liberar/bloquear/desbloquear obra e fonograma |

### Mapeamento Atual de Endpoints

| Endpoint | Permissao aplicada |
|----------|--------------------|
| `GET /api/v1/associacoes` | `AssociacaoListar` |
| `GET /api/v1/associacoes/{id}` | `AssociacaoVisualizar` |
| `GET /api/v1/titulares` | `TitularListar` |
| `GET /api/v1/titulares/{id}` | `TitularVisualizar` |
| `GET /api/v1/titulares/busca` | `TitularidadeBuscar` |
| `POST /api/v1/titulares` | `TitularCriar` |
| `PUT /api/v1/titulares/{id}` | `TitularEditar` |
| `DELETE /api/v1/titulares/{id}` | `TitularExcluir` |
| `GET /api/v1/obras` | `ObraListar` |
| `GET /api/v1/obras/{id}` | `ObraVisualizar` |
| `POST /api/v1/obras` | `ObraCriar` |
| `PUT /api/v1/obras/{id}` | `ObraEditar` |
| `DELETE /api/v1/obras/{id}` | `ObraExcluir` |
| `POST /api/v1/obras/{id}/iswc` | `ObraGerarIswc` |
| `POST /api/v1/obras/{id}/depurar` | `ObraDepurar` |
| `PUT /api/v1/obras/{id}/dominio-publico` | `ObraDominioPublico` |
| `POST /api/v1/obras/{id}/liberar` | `StatusLiberarObra` |
| `POST /api/v1/obras/{id}/bloquear` | `StatusBloquearObra` |
| `POST /api/v1/obras/{id}/desbloquear` | `StatusDesbloquearObra` |
| `GET /api/v1/obras/{id}/historico-bloqueios` | `StatusVisualizarHistoricoObra` |
| `GET /api/v1/obras/{obraId}/titularidades` | `TitularidadeListar` |
| `POST /api/v1/obras/{obraId}/titularidades` | `TitularidadeAdicionar` |
| `PUT /api/v1/obras/{obraId}/titularidades/{id}` | `TitularidadeEditar` |
| `DELETE /api/v1/obras/{obraId}/titularidades/{id}` | `TitularidadeRemover` |
| `GET /api/v1/fonogramas` | `FonogramaListar` |
| `GET /api/v1/fonogramas/{id}` | `FonogramaVisualizar` |
| `GET /api/v1/obras/{obraId}/fonogramas` | `FonogramaListarPorObra` |
| `POST /api/v1/fonogramas` | `FonogramaCriar` |
| `PUT /api/v1/fonogramas/{id}` | `FonogramaEditar` |
| `PATCH /api/v1/fonogramas/{id}/url-audio` | `FonogramaEditar` |
| `DELETE /api/v1/fonogramas/{id}` | `FonogramaExcluir` |
| `POST /api/v1/fonogramas/{id}/depurar` | `FonogramaDepurar` |
| `POST /api/v1/fonogramas/{id}/liberar` | `StatusLiberarFonograma` |
| `POST /api/v1/fonogramas/{id}/bloquear` | `StatusBloquearFonograma` |
| `POST /api/v1/fonogramas/{id}/desbloquear` | `StatusDesbloquearFonograma` |
| `GET /api/v1/fonogramas/{id}/historico-bloqueios` | `StatusVisualizarHistoricoFonograma` |
| `GET /api/v1/fonogramas/{fonogramaId}/participacoes` | `ParticipacaoListar` |
| `POST /api/v1/fonogramas/{fonogramaId}/participacoes` | `ParticipacaoAdicionar` |
| `PUT /api/v1/fonogramas/{fonogramaId}/participacoes/{id}` | `ParticipacaoAjustar` |
| `DELETE /api/v1/fonogramas/{fonogramaId}/participacoes/{id}` | `ParticipacaoRemover` |
| `POST /api/v1/fonogramas/{fonogramaId}/participacoes/calcular` | `ParticipacaoCalcular` |
| `GET /api/v1/busca` | `ObraListar` |
| `POST /api/v1/distribuicao/ownership-snapshot` | `TitularidadeListar` |

### Papeis Seedados

`seeds/mcad/roles.json` define:

- `cadastro.default.consultor`: conjunto de leitura do Cadastro.
- `cadastro.default.analista`: leitura + escrita/operacoes do Cadastro.

Esses papeis sao usados pelo ecad-authz para calcular o contexto efetivo de permissoes. A API de Cadastro nao decide escrita por nome de role; ela pergunta ao ecad-authz se o token atual possui a permissao exigida pelo endpoint.

### Testes Implementados

| Teste | Cobertura |
|-------|-----------|
| `AuthEndpointsTests` | 401 sem token, 403 quando AuthZ nega, 200 quando AuthZ permite, consultor bloqueado em POST, analista cria titular. |
| `CadastroPermissions_Catalog_HasExpectedShape` | Garante 41 permissoes `cadastro:default:*` sem duplicidade. |
| `KeycloakClaimsTransformationTests` | Apesar do nome legado, testa `LogtoClaimsTransformation` com claim flat `roles`. |
| `PermissionAuthorizationHandlerTests` | Valida chamada ao `IEcadAuthzClient` com permissao e Bearer token. |
| `HttpEcadAuthzClientTests` | Valida decisao permitida e fallback negado por indisponibilidade remota. |

### Divergencias do Plano Original

- O arquivo de transformacao ainda se chama `KeycloakClaimsTransformation.cs`, mas a classe efetiva e `LogtoClaimsTransformation`.
- O backend nao usa policies `read`/`write`; usa autorizacao por permissao exata.
- A claim efetiva de roles e `roles`, nao `realm_access.roles`.
- A decisao final de acesso vem do ecad-authz, nao de roles locais no `ClaimsPrincipal`.
