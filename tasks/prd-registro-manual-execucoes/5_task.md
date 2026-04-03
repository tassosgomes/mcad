---
status: completed
parallelizable: false
blocked_by: [4.0]
---

<task_context>
<domain>identificacao/api</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>"9.0"</unblocks>
</task_context>

# Tarefa 5.0: Backend — API (Endpoints, Program.cs updates)

## Relacionada aos Requisitos

- RF-01 a RF-08 — todos os endpoints REST de execuções
- Segurança — auth policies, extração de analista do JWT
- Observabilidade — logging do HttpClient

## Visão Geral

Criar os endpoints de execuções (sub-recurso de captações) e tipos de utilização, registrar novos repositórios e o HttpClient para Cadastro no Program.cs, e atualizar o .env.example.

## Arquivos Envolvidos

- **Criar:**
  - `services/identificacao-api/1-Services/Identificacao.API/Endpoints/ExecucaoEndpoints.cs`
  - `services/identificacao-api/1-Services/Identificacao.API/Endpoints/TipoUtilizacaoEndpoints.cs`
- **Modificar:**
  - `services/identificacao-api/1-Services/Identificacao.API/Program.cs` (registrar repos, HttpClient, mapear endpoints)
  - `services/identificacao-api/.env.example` (adicionar `CADASTRO_API_BASE_URL`)
- **Referência:**
  - `services/identificacao-api/1-Services/Identificacao.API/Endpoints/CaptacaoEndpoints.cs` (padrão de endpoints)
  - `services/cadastro-api/1-Services/Cadastro.API/Program.cs` (padrão HttpClient com Polly)
  - `tasks/prd-registro-manual-execucoes/api-contract.yaml`

## Subtarefas

- [x] 5.1 Criar `TipoUtilizacaoEndpoints.cs` — `GET /api/v1/tipos-utilizacao`
- [x] 5.2 Criar `ExecucaoEndpoints.cs` — sub-recurso `/api/v1/captacoes/{captacaoId}/execucoes` (GET list, POST, PUT, DELETE)
- [x] 5.3 Extrair analistaId do JWT nos endpoints de escrita (POST, PUT, DELETE)
- [x] 5.4 Registrar no Program.cs: `IExecucaoRepository`, `ITipoUtilizacaoRepository`, `ICadastroHttpClient` (AddHttpClient com Polly)
- [x] 5.5 Mapear novos endpoints no Program.cs
- [x] 5.6 Atualizar `.env.example` com `CADASTRO_API_BASE_URL`
- [x] 5.7 Testar endpoints com curl

## Sequenciamento

- Bloqueado por: 4.0
- Desbloqueia: 9.0 (frontend precisa do backend rodando)
- Paralelizável: Não

## Detalhes de Implementação

**ExecucaoEndpoints.cs:**
```csharp
public static class ExecucaoEndpoints
{
    public static void MapExecucaoEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/captacoes/{captacaoId:guid}/execucoes")
            .WithTags("Execuções");

        // GET — Listar
        group.MapGet("/", async (
            Guid captacaoId,
            [AsParameters] ListarExecucoesQuery query,
            IDispatcher dispatcher,
            CancellationToken ct) =>
        {
            var q = query with { CaptacaoId = captacaoId };
            var result = await dispatcher.QueryAsync(q, ct);
            return Results.Ok(result);
        })
        .RequireAuthorization("read");

        // POST — Criar
        group.MapPost("/", async (
            Guid captacaoId,
            [FromBody] CriarExecucaoRequest request,
            HttpContext httpContext,
            IDispatcher dispatcher,
            CancellationToken ct) =>
        {
            var analistaId = Guid.Parse(httpContext.User.FindFirst("sub")?.Value!);
            var command = new CriarExecucaoCommand(
                captacaoId, request.ObraId, request.FonogramaId,
                request.Inicio, request.Fim, request.Quantidade,
                request.TipoUtilizacaoId, request.TituloPrograma,
                analistaId);
            var result = await dispatcher.SendAsync(command, ct);
            return Results.Created($"/api/v1/captacoes/{captacaoId}/execucoes/{result.Id}", result);
        })
        .RequireAuthorization("write");

        // PUT — Atualizar
        group.MapPut("/{id:guid}", async (
            Guid captacaoId, Guid id,
            [FromBody] AtualizarExecucaoRequest request,
            HttpContext httpContext,
            IDispatcher dispatcher,
            CancellationToken ct) =>
        {
            var analistaId = Guid.Parse(httpContext.User.FindFirst("sub")?.Value!);
            var command = new AtualizarExecucaoCommand(
                captacaoId, id,
                request.ObraId, request.FonogramaId,
                request.Inicio, request.Fim, request.Quantidade,
                request.TipoUtilizacaoId, request.TituloPrograma,
                analistaId);
            var result = await dispatcher.SendAsync(command, ct);
            return Results.Ok(result);
        })
        .RequireAuthorization("write");

        // DELETE — Excluir
        group.MapDelete("/{id:guid}", async (
            Guid captacaoId, Guid id,
            HttpContext httpContext,
            IDispatcher dispatcher,
            CancellationToken ct) =>
        {
            var analistaId = Guid.Parse(httpContext.User.FindFirst("sub")?.Value!);
            await dispatcher.SendAsync(new ExcluirExecucaoCommand(captacaoId, id, analistaId), ct);
            return Results.NoContent();
        })
        .RequireAuthorization("write");
    }
}

public record CriarExecucaoRequest(
    Guid ObraId, Guid? FonogramaId,
    TimeOnly Inicio, TimeOnly Fim, int Quantidade,
    Guid? TipoUtilizacaoId, string? TituloPrograma);

public record AtualizarExecucaoRequest(
    Guid ObraId, Guid? FonogramaId,
    TimeOnly Inicio, TimeOnly Fim, int Quantidade,
    Guid? TipoUtilizacaoId, string? TituloPrograma);
```

**Program.cs — registros adicionais:**
```csharp
// Repos
builder.Services.AddScoped<IExecucaoRepository, ExecucaoRepository>();
builder.Services.AddScoped<ITipoUtilizacaoRepository, TipoUtilizacaoRepository>();

// HttpClient para Cadastro
var cadastroBaseUrl = Environment.GetEnvironmentVariable("CADASTRO_API_BASE_URL")
    ?? "http://localhost:5001/api/v1";
builder.Services.AddHttpClient<ICadastroHttpClient, CadastroHttpClient>(client =>
{
    client.BaseAddress = new Uri(cadastroBaseUrl);
    client.Timeout = TimeSpan.FromSeconds(10);
}).AddTransientHttpErrorPolicy(p => p.RetryAsync(2));

// Mapear endpoints
app.MapExecucaoEndpoints();
app.MapTipoUtilizacaoEndpoints();
```

**.env.example — adicionar:**
```
CADASTRO_API_BASE_URL=http://localhost:5001/api/v1
```

## Critérios de Sucesso (Verificáveis)

- [x] Build compila: `cd services/identificacao-api && dotnet build`
- [x] Serviço inicia: `dotnet run` sem erros
- [x] GET tipos: `curl http://localhost:5100/api/v1/tipos-utilizacao` → 200 com 4 registros
- [x] POST execução: `curl -X POST http://localhost:5100/api/v1/captacoes/{id}/execucoes -H 'Content-Type: application/json' -d '{"obraId":"...","inicio":"14:30:00","fim":"14:33:45","quantidade":1}'` → 201 com duração 225
- [x] GET execuções: `curl http://localhost:5100/api/v1/captacoes/{id}/execucoes` → 200 com lista paginada
- [x] DELETE: → 204
- [x] GET captação detalhe: contadores de resumo atualizados (não mais zeros)
