---
status: pending
parallelizable: false
blocked_by: [3.0]
---

<task_context>
<domain>identificacao/api</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database,rabbitmq</dependencies>
<unblocks>"7.0"</unblocks>
</task_context>

# Tarefa 4.0: Backend — API (Endpoints, Program.cs)

## Visão Geral

Criar endpoints de verificação e cancelamento, registrar DistribuicaoEventConsumer no Program.cs.

## Arquivos Envolvidos

- **Criar:**
  - `services/identificacao-api/1-Services/Identificacao.API/Endpoints/CancelamentoEndpoints.cs`
- **Modificar:**
  - `services/identificacao-api/1-Services/Identificacao.API/Program.cs` (registrar consumer, mapear endpoints)
- **Referência:**
  - `tasks/prd-cancelamento-recriacao/api-contract.yaml`

## Subtarefas

- [ ] 4.1 Criar `CancelamentoEndpoints.cs` — GET /captacoes/{id}/pode-cancelar + POST /captacoes/{id}/cancelar
- [ ] 4.2 Extrair analistaId do JWT no POST cancelar
- [ ] 4.3 Registrar `DistribuicaoEventConsumer` como HostedService no Program.cs
- [ ] 4.4 Mapear CancelamentoEndpoints
- [ ] 4.5 Testar endpoints

## Sequenciamento

- Bloqueado por: 3.0
- Desbloqueia: 7.0 (frontend)
- Paralelizável: Não

## Detalhes de Implementação

**CancelamentoEndpoints.cs:**
```csharp
public static void MapCancelamentoEndpoints(this IEndpointRouteBuilder app)
{
    var group = app.MapGroup("/api/v1/captacoes/{captacaoId:guid}")
        .WithTags("Cancelamento");

    group.MapGet("/pode-cancelar", async (Guid captacaoId,
        IDispatcher dispatcher, CancellationToken ct) =>
    {
        var result = await dispatcher.QueryAsync(new PodeCancelarQuery(captacaoId), ct);
        return Results.Ok(result);
    }).RequireAuthorization("read");

    group.MapPost("/cancelar", async (Guid captacaoId,
        [FromBody] CancelarRolRequest request,
        HttpContext httpContext, IDispatcher dispatcher, CancellationToken ct) =>
    {
        var analistaId = Guid.Parse(httpContext.User.FindFirst("sub")?.Value!);
        var command = new CancelarRolCommand(captacaoId, request.Justificativa,
            request.OpcaoRecriacao, analistaId);
        var result = await dispatcher.SendAsync(command, ct);
        return Results.Ok(result);
    }).RequireAuthorization("write");
}

public record CancelarRolRequest(string Justificativa, string OpcaoRecriacao);
```

**Program.cs:**
```csharp
builder.Services.AddHostedService<DistribuicaoEventConsumer>();
app.MapCancelamentoEndpoints();
```

## Critérios de Sucesso (Verificáveis)

- [ ] Build: `cd services/identificacao-api && dotnet build`
- [ ] Serviço inicia (com RabbitMQ)
- [ ] GET pode-cancelar FECHADA não processada: → 200 podeCancelar=true
- [ ] GET pode-cancelar processada: → 200 podeCancelar=false
- [ ] POST cancelar APENAS_CANCELAR: → 200 novaCaptacaoId=null
- [ ] POST cancelar COPIAR_EXECUCOES: → 200 novaCaptacaoId preenchido + execucoesCopiadas
- [ ] POST cancelar distribuição processada: → 422 DISTRIBUICAO_PROCESSADA
- [ ] Evento outbox criado após cancelamento
