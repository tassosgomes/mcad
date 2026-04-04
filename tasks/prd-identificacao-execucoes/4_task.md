---
status: completed
parallelizable: false
blocked_by: [2.0, 3.0]
---

<task_context>
<domain>identificacao/api</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>"8.0"</unblocks>
</task_context>

# Tarefa 4.0: Backend — API (Endpoints, PendentesVerificadorWorker, Program.cs)

## Relacionada aos Requisitos

- RF-01 a RF-04 — endpoints REST
- RF-05 — PendentesVerificadorWorker

## Visão Geral

Criar os 4 endpoints de pendentes, o background job de re-verificação automática, e atualizar Program.cs.

## Arquivos Envolvidos

- **Criar:**
  - `services/identificacao-api/1-Services/Identificacao.API/Endpoints/PendenteEndpoints.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Pendentes/Services/PendentesVerificadorWorker.cs`
- **Modificar:**
  - `services/identificacao-api/1-Services/Identificacao.API/Program.cs` (registrar worker, mapear endpoints)
- **Referência:**
  - `services/identificacao-api/1-Services/Identificacao.API/Endpoints/CaptacaoEndpoints.cs` (padrão)
  - `services/identificacao-api/2-Application/Identificacao.Application/Uploads/Services/CsvProcessorWorker.cs` (padrão BackgroundService)
  - `tasks/prd-identificacao-execucoes/api-contract.yaml`

## Subtarefas

- [x] 4.1 Criar `PendenteEndpoints.cs` — GET /pendentes, GET /pendentes/impacto, POST /pendentes/{id}/resolver, POST /pendentes/resolver-lote
- [x] 4.2 Extrair analistaId do JWT nos endpoints de escrita
- [x] 4.3 Criar `PendentesVerificadorWorker` — poll a cada 5min, busca pendentes com obraId, consulta Cadastro por IDs únicos, resolve automaticamente se LIBERADO
- [x] 4.4 Registrar no Program.cs: `AddHostedService<PendentesVerificadorWorker>`, mapear `PendenteEndpoints`
- [x] 4.5 Testar endpoints + worker

## Sequenciamento

- Bloqueado por: 2.0, 3.0
- Desbloqueia: 8.0 (frontend precisa do backend)
- Paralelizável: Não

## Detalhes de Implementação

**PendenteEndpoints.cs:**
```csharp
public static void MapPendenteEndpoints(this IEndpointRouteBuilder app)
{
    var group = app.MapGroup("/api/v1/pendentes").WithTags("Pendentes");

    // GET / — Listar pendentes
    group.MapGet("/", async ([AsParameters] ListarPendentesQuery query,
        IDispatcher dispatcher, CancellationToken ct) =>
    {
        var result = await dispatcher.QueryAsync(query, ct);
        return Results.Ok(result);
    }).RequireAuthorization("read");

    // GET /impacto — Visão agrupada
    group.MapGet("/impacto", async ([AsParameters] ListarImpactoPendentesQuery query,
        IDispatcher dispatcher, CancellationToken ct) =>
    {
        var result = await dispatcher.QueryAsync(query, ct);
        return Results.Ok(result);
    }).RequireAuthorization("read");

    // POST /{id}/resolver — Individual
    group.MapPost("/{id:guid}/resolver", async (
        Guid id, [FromBody] ResolverPendenteRequest request,
        HttpContext httpContext, IDispatcher dispatcher, CancellationToken ct) =>
    {
        var analistaId = Guid.Parse(httpContext.User.FindFirst("sub")?.Value!);
        var command = new ResolverPendenteCommand(id, request.ObraId, request.FonogramaId, analistaId);
        var result = await dispatcher.SendAsync(command, ct);
        return Results.Ok(result);
    }).RequireAuthorization("write");

    // POST /resolver-lote — Lote
    group.MapPost("/resolver-lote", async (
        [FromBody] ResolverLoteRequest request,
        HttpContext httpContext, IDispatcher dispatcher, CancellationToken ct) =>
    {
        var analistaId = Guid.Parse(httpContext.User.FindFirst("sub")?.Value!);
        var command = new ResolverPendentesEmLoteCommand(
            request.ExecucaoIds, request.ObraId, request.FonogramaId, analistaId);
        var result = await dispatcher.SendAsync(command, ct);
        return Results.Ok(result);
    }).RequireAuthorization("write");
}

public record ResolverPendenteRequest(Guid ObraId, Guid? FonogramaId);
public record ResolverLoteRequest(List<Guid> ExecucaoIds, Guid ObraId, Guid? FonogramaId);
```

**PendentesVerificadorWorker:** conforme TechSpec — poll a cada 5min, batch por IDs únicos de obra, consulta Cadastro, resolve se LIBERADO, log de quantidade resolvida.

**Program.cs:**
```csharp
builder.Services.AddHostedService<PendentesVerificadorWorker>();
app.MapPendenteEndpoints();
```

## Critérios de Sucesso (Verificáveis)

- [x] Build: `cd services/identificacao-api && dotnet build`
- [x] Serviço inicia sem erros
- [x] GET pendentes: `curl http://localhost:5100/api/v1/pendentes` → 200
- [x] GET impacto: `curl http://localhost:5100/api/v1/pendentes/impacto` → 200 com agrupamento
- [x] POST resolver: → 200 com status IDENTIFICADA
- [x] POST resolver-lote: → 200 com resolvidas + rejeitadas
- [x] POST com obra não LIBERADA: → 422 OBRA_NAO_LIBERADA
- [x] Worker loga re-verificação a cada 5min
