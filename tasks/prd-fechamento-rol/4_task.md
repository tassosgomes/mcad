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

Criar endpoints de pré-requisitos e fechamento, registrar Outbox (writer, publisher, worker) e RabbitMQ no Program.cs.

## Arquivos Envolvidos

- **Criar:**
  - `services/identificacao-api/1-Services/Identificacao.API/Endpoints/FechamentoEndpoints.cs`
- **Modificar:**
  - `services/identificacao-api/1-Services/Identificacao.API/Program.cs` (Outbox, RabbitMQ, endpoints)
  - `services/identificacao-api/.env.example` (vars RabbitMQ se não em 1.0)
- **Referência:**
  - `services/cadastro-api/1-Services/Cadastro.API/Program.cs` (registro RabbitMQ)
  - `tasks/prd-fechamento-rol/api-contract.yaml`

## Subtarefas

- [ ] 4.1 Criar `FechamentoEndpoints.cs` — GET /captacoes/{id}/pre-requisitos + POST /captacoes/{id}/fechar
- [ ] 4.2 Extrair analistaId do JWT no POST fechar
- [ ] 4.3 Registrar no Program.cs: IOutboxEventWriter, IRabbitMqPublisher, OutboxPublisherWorker, mapear endpoints
- [ ] 4.4 Testar endpoints + verificar evento no outbox após fechamento

## Sequenciamento

- Bloqueado por: 3.0
- Desbloqueia: 7.0 (frontend)
- Paralelizável: Não

## Detalhes de Implementação

**FechamentoEndpoints.cs:**
```csharp
public static void MapFechamentoEndpoints(this IEndpointRouteBuilder app)
{
    var group = app.MapGroup("/api/v1/captacoes/{captacaoId:guid}")
        .WithTags("Fechamento do Rol");

    group.MapGet("/pre-requisitos", async (Guid captacaoId,
        IDispatcher dispatcher, CancellationToken ct) =>
    {
        var result = await dispatcher.QueryAsync(new ValidarPreRequisitosQuery(captacaoId), ct);
        return Results.Ok(result);
    }).RequireAuthorization("read");

    group.MapPost("/fechar", async (Guid captacaoId,
        HttpContext httpContext, IDispatcher dispatcher, CancellationToken ct) =>
    {
        var analistaId = Guid.Parse(httpContext.User.FindFirst("sub")?.Value!);
        var result = await dispatcher.SendAsync(new FecharRolCommand(captacaoId, analistaId), ct);
        return Results.Ok(result);
    }).RequireAuthorization("write");
}
```

## Critérios de Sucesso (Verificáveis)

- [ ] Build: `cd services/identificacao-api && dotnet build`
- [ ] Serviço inicia sem erros (com PostgreSQL + RabbitMQ)
- [ ] GET pre-requisitos: → 200 com checklist
- [ ] POST fechar (todos OK): → 200 com status FECHADA + eventoPublicado=true
- [ ] POST fechar (com pendentes): → 422 EXECUCOES_PENDENTES
- [ ] Verificar registro na tabela outbox_events após fechamento
