using Cadastro.API.Authorization;
using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Participacoes.Commands;
using Cadastro.Application.Participacoes.Queries;
using Microsoft.AspNetCore.Mvc;

namespace Cadastro.API.Endpoints;

public static class ParticipacaoEndpoints
{
    public static void MapParticipacaoEndpoints(this IEndpointRouteBuilder app, bool authEnabled)
    {
        var group = app
            .MapGroup("/api/v1/fonogramas/{fonogramaId:guid}/participacoes")
            .WithTags("Participações Conexas");

        // GET /api/v1/fonogramas/{fonogramaId}/participacoes
        group.MapGet("/", async (Guid fonogramaId, IDispatcher dispatcher, CancellationToken ct) =>
        {
            var result = await dispatcher.QueryAsync(new ListarParticipacoesQuery(fonogramaId), ct);
            return Results.Ok(result);
        })
        .RequireCadastroPermission(CadastroPermissions.ParticipacaoListar, authEnabled);

        // POST /api/v1/fonogramas/{fonogramaId}/participacoes
        group.MapPost("/", async (Guid fonogramaId, [FromBody] AdicionarParticipacaoRequest request, IDispatcher dispatcher, CancellationToken ct) =>
        {
            var command = new AdicionarParticipacaoCommand(fonogramaId, request.TitularId, request.Categoria);
            var result = await dispatcher.SendAsync(command, ct);
            return Results.Created($"/api/v1/fonogramas/{fonogramaId}/participacoes", result);
        })
        .RequireCadastroPermission(CadastroPermissions.ParticipacaoAdicionar, authEnabled);

        // PUT /api/v1/fonogramas/{fonogramaId}/participacoes/{id}
        group.MapPut("/{id:guid}", async (Guid fonogramaId, Guid id, [FromBody] AjustarPercentualRequest request, IDispatcher dispatcher, CancellationToken ct) =>
        {
            var command = new AjustarPercentualCommand(fonogramaId, id, request.Percentual);
            var result = await dispatcher.SendAsync(command, ct);
            return Results.Ok(result);
        })
        .RequireCadastroPermission(CadastroPermissions.ParticipacaoAjustar, authEnabled);

        // DELETE /api/v1/fonogramas/{fonogramaId}/participacoes/{id}
        group.MapDelete("/{id:guid}", async (Guid fonogramaId, Guid id, IDispatcher dispatcher, CancellationToken ct) =>
        {
            var command = new RemoverParticipacaoCommand(fonogramaId, id);
            var result = await dispatcher.SendAsync(command, ct);
            return Results.Ok(result);
        })
        .RequireCadastroPermission(CadastroPermissions.ParticipacaoRemover, authEnabled);

        // POST /api/v1/fonogramas/{fonogramaId}/participacoes/calcular
        group.MapPost("/calcular", async (Guid fonogramaId, IDispatcher dispatcher, CancellationToken ct) =>
        {
            var command = new CalcularPercentuaisCommand(fonogramaId);
            var result = await dispatcher.SendAsync(command, ct);
            return Results.Ok(result);
        })
        .RequireCadastroPermission(CadastroPermissions.ParticipacaoCalcular, authEnabled);
    }
}

public record AdicionarParticipacaoRequest(Guid TitularId, string Categoria);
public record AjustarPercentualRequest(decimal Percentual);
