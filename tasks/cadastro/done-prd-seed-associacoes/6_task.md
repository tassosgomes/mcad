---
status: done
parallelizable: false
blocked_by: ["4.0", "5.0"]
---

<task_context>
<domain>backend/api</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>"7.0"</unblocks>
</task_context>

# Tarefa 6.0: Camada API — Endpoints, Program.cs e Health Check

## Relacionada às User Stories

- [HU-01] Consultar associações (direta — endpoints REST)
- [HU-03] Selecionar associação ao cadastrar titular (suporte — API pronta para F02)

## Visão Geral

Configurar `Program.cs` com DI (DbContext, Repository, CQRS, Health Check), criar Minimal API endpoints GET + bloqueio 405, Global Exception Handler com ProblemDetails, e CORS para o frontend.

## Requisitos

- Program.cs com toda a configuração DI
- GET /api/v1/associacoes — lista todas
- GET /api/v1/associacoes/{id} — busca por ID (404 se não encontrado)
- POST/PUT/PATCH/DELETE → 405 Method Not Allowed
- Global Exception Handler com ProblemDetails (RFC 7807)
- Health check em GET /health
- CORS habilitado para localhost:5173 (frontend dev)
- Connection string lida do .env

## Arquivos Envolvidos

- **Criar:**
  - `services/cadastro-api/1-Services/Cadastro.API/Program.cs`
  - `services/cadastro-api/1-Services/Cadastro.API/Endpoints/AssociacaoEndpoints.cs`
- **Referência:**
  - `tasks/prd-seed-associacoes/api-contract.yaml` (contrato de API)
  - `tasks/prd-seed-associacoes/techspec.md` (seção "Endpoints de API")
- **Skills para consultar:**
  - `dotnet-architecture` — Minimal API, Global Exception Handler, DI registration
  - `dotnet-code-quality` — ProblemDetails, error handling
  - `common/restful-api` — versionamento via path, 405 handling

## Subtarefas

- [ ] 6.1 Criar `Program.cs` com DI: DbContext, Repository, Dispatcher, CQRS handlers, Health Check, CORS
- [ ] 6.2 Configurar connection string lida de environment variables (.env)
- [ ] 6.3 Criar `AssociacaoEndpoints.cs` com GET /api/v1/associacoes e GET /api/v1/associacoes/{id}
- [ ] 6.4 Implementar bloqueio 405 para POST/PUT/PATCH/DELETE
- [ ] 6.5 Implementar Global Exception Handler com ProblemDetails
- [ ] 6.6 Configurar health check: GET /health (verifica PostgreSQL)
- [ ] 6.7 Testar manualmente: `dotnet run` + curl

## Sequenciamento

- Bloqueado por: 4.0, 5.0
- Desbloqueia: 7.0
- Paralelizável: Não

## Detalhes de Implementação

### Endpoints (Minimal API)

```csharp
public static class AssociacaoEndpoints
{
    public static void MapAssociacaoEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/v1/associacoes")
            .WithTags("Associações");

        group.MapGet("/", ListarAssociacoes);
        group.MapGet("/{id:guid}", BuscarPorId);

        // Bloquear verbos de escrita
        group.MapPost("/", () => Results.Problem(
            detail: "Associações são dados de referência e não podem ser modificados",
            statusCode: 405, title: "Method Not Allowed"))
            .ExcludeFromDescription();
        // ... PUT, PATCH, DELETE idem
    }
}
```

### Program.cs — DI Registration

```csharp
// DbContext
builder.Services.AddDbContext<CadastroDbContext>(options =>
    options.UseNpgsql(connectionString, npgsql =>
        npgsql.MigrationsHistoryTable("__EFMigrationsHistory", "cadastro")));

// Repository
builder.Services.AddScoped<IAssociacaoRepository, AssociacaoRepository>();

// CQRS
builder.Services.AddScoped<IDispatcher, Dispatcher>();
builder.Services.Scan(scan => scan
    .FromAssemblyOf<GetAssociacoesQuery>()
    .AddClasses(c => c.AssignableTo(typeof(IQueryHandler<,>)))
    .AsImplementedInterfaces()
    .WithScopedLifetime());

// Health Check
builder.Services.AddHealthChecks()
    .AddNpgSql(connectionString);

// CORS
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins("http://localhost:5173").AllowAnyHeader().AllowAnyMethod()));

// Exception Handler
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
```

**Convenções da stack:**
- Minimal API (não Controllers)
- ProblemDetails para todos os erros
- CORS restrito ao frontend dev
- Scrutor para scan automático de handlers
- Migrations aplicadas no startup (`context.Database.Migrate()`)

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet build` compila sem erros
- [ ] `dotnet run` inicia sem erros na porta 5001
- [ ] `curl http://localhost:5001/api/v1/associacoes` retorna 200 com 7 registros JSON
- [ ] `curl http://localhost:5001/api/v1/associacoes/{uuid-valido}` retorna 200 com 1 registro
- [ ] `curl http://localhost:5001/api/v1/associacoes/{uuid-invalido}` retorna 404 ProblemDetails
- [ ] `curl -X POST http://localhost:5001/api/v1/associacoes` retorna 405 ProblemDetails
- [ ] `curl http://localhost:5001/health` retorna 200 Healthy
