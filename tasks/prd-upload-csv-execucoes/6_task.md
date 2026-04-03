---
status: completed
parallelizable: false
blocked_by: [5.0]
---

<task_context>
<domain>identificacao/api</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>database</dependencies>
<unblocks>"10.0"</unblocks>
</task_context>

# Tarefa 6.0: Backend — API (Endpoints, CsvProcessorWorker, Program.cs)

## Relacionada aos Requisitos

- RF-01 a RF-09 — endpoints + processamento assíncrono

## Visão Geral

Criar os endpoints de upload (multipart), status e erros, o CsvProcessorWorker (background job que processa CSVs pendentes), e atualizar o Program.cs com todos os registros.

## Arquivos Envolvidos

- **Criar:**
  - `services/identificacao-api/1-Services/Identificacao.API/Endpoints/UploadEndpoints.cs`
  - `services/identificacao-api/2-Application/Identificacao.Application/Uploads/Services/CsvProcessorWorker.cs`
- **Modificar:**
  - `services/identificacao-api/1-Services/Identificacao.API/Program.cs` (registrar repos, MinIO, CsvParser, Worker, mapear endpoints)
  - `services/identificacao-api/.env.example` (vars MinIO se não adicionadas em 1.0)
- **Referência:**
  - `services/identificacao-api/1-Services/Identificacao.API/Endpoints/CaptacaoEndpoints.cs` (padrão endpoints)
  - `services/identificacao-api/1-Services/Identificacao.API/Endpoints/ExecucaoEndpoints.cs` (padrão sub-recurso)
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Events/OutboxPublisherWorker.cs` (padrão BackgroundService)
  - `tasks/prd-upload-csv-execucoes/api-contract.yaml`

## Subtarefas

- [x] 6.1 Criar `UploadEndpoints.cs` — POST multipart `/captacoes/{id}/uploads` (202), GET list, GET by id, GET erros
- [x] 6.2 Implementar recepção multipart no POST: extrair `IFormFile`, passar stream para command
- [x] 6.3 Criar `CsvProcessorWorker` — BackgroundService que poll DB a cada 5s, processa uploads pendentes usando CsvParser + CadastroHttpClient + ExecucaoRepository
- [x] 6.4 No Worker: batch save de execuções a cada 100 linhas, persistir erros, atualizar status do upload
- [x] 6.5 No Worker: verificar captação ainda ABERTA antes de cada batch
- [x] 6.6 Registrar no Program.cs: IUploadRepository, IErroUploadRepository, CsvParser, CsvProcessorWorker (AddHostedService), mapear UploadEndpoints
- [x] 6.7 Testar endpoints + processamento end-to-end

## Sequenciamento

- Bloqueado por: 5.0
- Desbloqueia: 10.0 (frontend precisa do backend)
- Paralelizável: Não

## Detalhes de Implementação

**UploadEndpoints.cs — POST multipart:**
```csharp
public static void MapUploadEndpoints(this IEndpointRouteBuilder app)
{
    var group = app.MapGroup("/api/v1/captacoes/{captacaoId:guid}/uploads")
        .WithTags("Uploads CSV");

    group.MapPost("/", async (
        Guid captacaoId,
        IFormFile arquivo,
        HttpContext httpContext,
        IDispatcher dispatcher,
        CancellationToken ct) =>
    {
        var analistaId = Guid.Parse(httpContext.User.FindFirst("sub")?.Value!);
        using var stream = arquivo.OpenReadStream();

        var command = new CriarUploadCommand(captacaoId, arquivo.FileName, stream, analistaId);
        var result = await dispatcher.SendAsync(command, ct);
        return Results.Accepted($"/api/v1/captacoes/{captacaoId}/uploads/{result.Id}", result);
    })
    .RequireAuthorization("write")
    .DisableAntiforgery();

    group.MapGet("/", async (
        Guid captacaoId,
        int page, int size,
        IDispatcher dispatcher,
        CancellationToken ct) =>
    {
        var result = await dispatcher.QueryAsync(
            new ListarUploadsQuery(captacaoId, page, size), ct);
        return Results.Ok(result);
    })
    .RequireAuthorization("read");

    group.MapGet("/{id:guid}", async (
        Guid captacaoId, Guid id,
        IDispatcher dispatcher,
        CancellationToken ct) =>
    {
        var result = await dispatcher.QueryAsync(
            new GetUploadByIdQuery(captacaoId, id), ct);
        return Results.Ok(result);
    })
    .RequireAuthorization("read");

    group.MapGet("/{id:guid}/erros", async (
        Guid captacaoId, Guid id,
        int page, int size,
        IDispatcher dispatcher,
        CancellationToken ct) =>
    {
        var result = await dispatcher.QueryAsync(
            new ListarErrosUploadQuery(captacaoId, id, page, size), ct);
        return Results.Ok(result);
    })
    .RequireAuthorization("read");
}
```

**CsvProcessorWorker — loop principal:**
```csharp
protected override async Task ExecuteAsync(CancellationToken ct)
{
    while (!ct.IsCancellationRequested)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var uploadRepo = scope.ServiceProvider.GetRequiredService<IUploadRepository>();
            var pendentes = await uploadRepo.ListarPendentesAsync(ct);

            foreach (var upload in pendentes)
            {
                await ProcessarUploadAsync(scope.ServiceProvider, upload, ct);
            }
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogError(ex, "Erro no CsvProcessorWorker");
        }

        await Task.Delay(TimeSpan.FromSeconds(5), ct);
    }
}
```

**Worker — ProcessarUploadAsync:** conforme TechSpec Backend — download MinIO → parse → validar → detectar duplicatas → agrupar → consultar Cadastro → criar execuções em batches de 100 → persistir erros → MarcarConcluido/MarcarErro.

**Program.cs — registros:**
```csharp
builder.Services.AddScoped<IUploadRepository, UploadRepository>();
builder.Services.AddScoped<IErroUploadRepository, ErroUploadRepository>();
builder.Services.AddScoped<CsvParser>();
builder.Services.AddHostedService<CsvProcessorWorker>();

app.MapUploadEndpoints();
```

## Critérios de Sucesso (Verificáveis)

- [ ] Build: `cd services/identificacao-api && dotnet build`
- [ ] Serviço inicia sem erros (com PostgreSQL + MinIO rodando)
- [ ] POST upload: `curl -X POST -F "arquivo=@test.csv" http://localhost:5100/api/v1/captacoes/{id}/uploads` → 202
- [ ] GET status (polling): → status evolui de PROCESSANDO → CONCLUIDO ou CONCLUIDO_COM_ERROS
- [ ] GET erros: → lista paginada com linha/coluna/mensagem
- [ ] Worker processa CSV e cria execuções (verificar GET /execucoes após processamento)
- [ ] Worker loga erros corretamente no console
