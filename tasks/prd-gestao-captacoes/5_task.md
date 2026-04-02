---
status: completed
parallelizable: false
blocked_by: [4.0]
---

<task_context>
<domain>identificacao/api</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>database</dependencies>
<unblocks>"9.0"</unblocks>
</task_context>

# Tarefa 5.0: Backend — API (Program.cs, Endpoints, Auth, Exception Handler)

## Relacionada aos Requisitos

- RF-01 a RF-05 — todos os endpoints REST
- Segurança — JWT Bearer, policies read/write
- Observabilidade — health check, structured logging

## Visão Geral

Configurar o entrypoint do serviço (Program.cs) com EF Core, autenticação JWT, CORS, exception handler, health check e registrar os endpoints de Captações e Rubricas conforme o api-contract.yaml.

## Arquivos Envolvidos

- **Criar:**
  - `services/identificacao-api/1-Services/Identificacao.API/Program.cs`
  - `services/identificacao-api/1-Services/Identificacao.API/Endpoints/CaptacaoEndpoints.cs`
  - `services/identificacao-api/1-Services/Identificacao.API/Endpoints/RubricaEndpoints.cs`
  - `services/identificacao-api/1-Services/Identificacao.API/Infrastructure/GlobalExceptionHandler.cs`
  - `services/identificacao-api/1-Services/Identificacao.API/Infrastructure/KeycloakClaimsTransformation.cs`
  - `services/identificacao-api/.env.example`
- **Referência:**
  - `services/cadastro-api/1-Services/Cadastro.API/Program.cs` (configuração completa)
  - `services/cadastro-api/1-Services/Cadastro.API/Endpoints/ObraEndpoints.cs` (padrão de endpoints)
  - `services/cadastro-api/1-Services/Cadastro.API/Infrastructure/GlobalExceptionHandler.cs`
  - `services/cadastro-api/1-Services/Cadastro.API/Infrastructure/KeycloakClaimsTransformation.cs`
  - `tasks/prd-gestao-captacoes/api-contract.yaml` (contrato da API)

## Subtarefas

- [x] 5.1 Criar `GlobalExceptionHandler` mapeando exceções para ProblemDetails (copiar padrão do Cadastro, adicionar ForbiddenException → 403)
- [x] 5.2 Criar `KeycloakClaimsTransformation` (copiar do Cadastro)
- [x] 5.3 Criar `Program.cs` com: EF Core + Npgsql, auth JWT, CORS, Scrutor (handler auto-registration), FluentValidation, exception handler, health check
- [x] 5.4 Criar `RubricaEndpoints.cs` — GET /api/v1/rubricas
- [x] 5.5 Criar `CaptacaoEndpoints.cs` — GET/POST /captacoes, GET/PUT/DELETE /captacoes/{id}
- [x] 5.6 Extrair analistaId e analistaNome do JWT nos endpoints de escrita
- [x] 5.7 Criar `.env.example` com variáveis de ambiente documentadas
- [x] 5.8 Testar startup: `dotnet run` sem erros, `/health` responde 200

## Sequenciamento

- Bloqueado por: 4.0
- Desbloqueia: 9.0 (frontend precisa do backend rodando)
- Paralelizável: Não

## Detalhes de Implementação

**Program.cs — Configuração:**
```csharp
// DB
var connectionString = $"Host={dbHost};Port={dbPort};Database={dbName};Username={dbUser};Password={dbPassword};Search Path=identificacao";
builder.Services.AddDbContext<IdentificacaoDbContext>(options =>
    options.UseNpgsql(connectionString, npgsql =>
        npgsql.MigrationsHistoryTable("__EFMigrationsHistory", "identificacao")));

// Repositories
builder.Services.AddScoped<ICaptacaoRepository, CaptacaoRepository>();
builder.Services.AddScoped<IRubricaRepository, RubricaRepository>();

// CQRS
builder.Services.AddScoped<IDispatcher, Dispatcher>();
builder.Services.Scan(scan => scan
    .FromAssemblyOf<ListarRubricasQuery>()
    .AddClasses(c => c.AssignableTo(typeof(IQueryHandler<,>)))
    .AsImplementedInterfaces().WithScopedLifetime());
builder.Services.Scan(scan => scan
    .FromAssemblyOf<CriarCaptacaoCommand>()
    .AddClasses(c => c.AssignableTo(typeof(ICommandHandler<,>)))
    .AsImplementedInterfaces().WithScopedLifetime());

// Validators
builder.Services.AddValidatorsFromAssemblyContaining<CriarCaptacaoCommandValidator>();

// Auth (condicionada por AUTH_ENABLED)
if (authEnabled)
{
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options => { /* Keycloak config */ });
    builder.Services.AddAuthorization(options =>
    {
        options.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build();
        options.AddPolicy("read", p => p.RequireRole("analista-identificacao", "consultor-identificacao"));
        options.AddPolicy("write", p => p.RequireRole("analista-identificacao"));
    });
}

// CORS
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins("http://localhost:5173").AllowAnyHeader().AllowAnyMethod()));

// Porta
builder.WebHost.UseUrls("http://0.0.0.0:5100");
```

**CaptacaoEndpoints.cs — Extração do JWT:**
```csharp
group.MapPost("/", async (
    [FromBody] CriarCaptacaoRequest request,
    HttpContext httpContext,
    IDispatcher dispatcher,
    CancellationToken ct) =>
{
    var analistaId = Guid.Parse(httpContext.User.FindFirst("sub")?.Value ?? throw new UnauthorizedAccessException());
    var analistaNome = httpContext.User.FindFirst("name")?.Value ?? "Desconhecido";

    var command = new CriarCaptacaoCommand(
        request.RubricaId, request.Periodo, request.UsuarioDeMusica,
        analistaId, analistaNome);

    var result = await dispatcher.SendAsync(command, ct);
    return Results.Created($"/api/v1/captacoes/{result.Id}", result);
})
.RequireAuthorization("write");
```

**Request records (definidos no endpoint file):**
```csharp
public record CriarCaptacaoRequest(Guid RubricaId, DateOnly Periodo, string UsuarioDeMusica);
public record AtualizarCaptacaoRequest(Guid RubricaId, DateOnly Periodo, string UsuarioDeMusica);
```

**GlobalExceptionHandler — mapeamento:**
```csharp
DomainException => StatusCodes.Status422UnprocessableEntity
NotFoundException => StatusCodes.Status404NotFound
ConflictException => StatusCodes.Status409Conflict (com code customizado)
ForbiddenException => StatusCodes.Status403Forbidden
ValidationException => StatusCodes.Status400BadRequest
_ => StatusCodes.Status500InternalServerError
```

**.env.example:**
```
IDENTIFICACAO_DB_HOST=localhost
IDENTIFICACAO_DB_PORT=5432
IDENTIFICACAO_DB_NAME=postgres
IDENTIFICACAO_DB_USER=postgres
IDENTIFICACAO_DB_PASSWORD=postgres
IDENTIFICACAO_DB_SCHEMA=identificacao
OIDC_AUTHORITY=http://localhost:8080/realms/mcad
OIDC_AUDIENCE=mcad-frontend
AUTH_ENABLED=true
```

**Endpoints mapeados (conforme api-contract.yaml):**

| Método | Path | Auth | Handler |
|--------|------|------|---------|
| GET | `/api/v1/rubricas` | read | ListarRubricasQueryHandler |
| GET | `/api/v1/captacoes` | read | ListarCaptacoesQueryHandler |
| POST | `/api/v1/captacoes` | write | CriarCaptacaoCommandHandler |
| GET | `/api/v1/captacoes/{id:guid}` | read | GetCaptacaoByIdQueryHandler |
| PUT | `/api/v1/captacoes/{id:guid}` | write | AtualizarCaptacaoCommandHandler |
| DELETE | `/api/v1/captacoes/{id:guid}` | write | ExcluirCaptacaoCommandHandler |

**Migrations no startup:**
```csharp
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<IdentificacaoDbContext>();
    context.Database.Migrate();
}
```

## Critérios de Sucesso (Verificáveis)

- [x] Build compila: `cd services/identificacao-api && dotnet build`
- [x] Serviço inicia sem erros: `cd services/identificacao-api/1-Services/Identificacao.API && dotnet run` (com PostgreSQL rodando)
- [x] Health check: `curl http://localhost:5100/health` → 200
- [x] GET rubricas: `curl http://localhost:5100/api/v1/rubricas` → 200 com 7 registros
- [x] POST captação: `curl -X POST http://localhost:5100/api/v1/captacoes -H 'Content-Type: application/json' -d '{"rubricaId":"b1a2c3d4-0001-0000-0000-000000000002","periodo":"2026-01-15","usuarioDeMusica":"TV Globo"}' ` → 201
- [x] POST duplicado: mesmo request → 409 com code `CAPTACAO_DUPLICADA`
- [x] DELETE: `curl -X DELETE http://localhost:5100/api/v1/captacoes/{id}` → 204
