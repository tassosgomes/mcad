using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Fonogramas.Commands;
using Cadastro.Application.Fonogramas.Queries;
using Microsoft.AspNetCore.Mvc;

namespace Cadastro.API.Endpoints;

public static class FonogramaEndpoints
{
    public static void MapFonogramaEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/fonogramas").WithTags("Fonogramas");

        group.MapGet("/", async ([AsParameters] ListarFonogramasQuery query, IDispatcher dispatcher, CancellationToken ct) =>
        {
            var result = await dispatcher.QueryAsync(query, ct);
            return Results.Ok(result);
        });

        group.MapPost("/", async ([FromBody] CriarFonogramaCommand command, IDispatcher dispatcher, CancellationToken ct) =>
        {
            var result = await dispatcher.SendAsync(command, ct);
            return Results.Created($"/api/v1/fonogramas/{result.Id}", result);
        });

        group.MapGet("/{id:guid}", async (Guid id, IDispatcher dispatcher, CancellationToken ct) =>
        {
            var result = await dispatcher.QueryAsync(new GetFonogramaByIdQuery(id), ct);
            return Results.Ok(result);
        });

        group.MapPut("/{id:guid}", async (Guid id, [FromBody] AtualizarFonogramaRequest request, IDispatcher dispatcher, CancellationToken ct) =>
        {
            var command = new AtualizarFonogramaCommand(id, request.Isrc, request.PaisOrigem, request.DataGravacao, request.DataLancamento);
            var result = await dispatcher.SendAsync(command, ct);
            return Results.Ok(result);
        });

        group.MapDelete("/{id:guid}", async (Guid id, IDispatcher dispatcher, CancellationToken ct) =>
        {
            await dispatcher.SendAsync(new ExcluirFonogramaCommand(id), ct);
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/depurar", async (Guid id, [FromBody] DepurarFonogramaRequest request, IDispatcher dispatcher, CancellationToken ct) =>
        {
            var command = new DepurarFonogramaCommand(id, request.Isrc, request.PaisOrigem, request.DataGravacao, request.DataLancamento);
            var result = await dispatcher.SendAsync(command, ct);
            return Results.Created($"/api/v1/fonogramas/{result.NovoFonograma.Id}", result);
        });

        var obraGroup = app.MapGroup("/api/v1/obras/{obraId:guid}/fonogramas").WithTags("Fonogramas");
        
        obraGroup.MapGet("/", async (Guid obraId, IDispatcher dispatcher, CancellationToken ct) =>
        {
            var result = await dispatcher.QueryAsync(new ListarFonogramasPorObraQuery(obraId), ct);
            return Results.Ok(result);
        });

        group.MapPost("/{id:guid}/liberar", async (Guid id, IDispatcher dispatcher, CancellationToken ct) =>
        {
            var command = new Cadastro.Application.Status.Commands.LiberarFonogramaCommand(id);
            var result = await dispatcher.SendAsync(command, ct);
            return Results.Ok(result);
        });

        group.MapPost("/{id:guid}/bloquear", async (Guid id, [FromBody] Cadastro.Application.Status.Commands.BloquearFonogramaCommand commandArgs, IDispatcher dispatcher, CancellationToken ct) =>
        {
            var command = new Cadastro.Application.Status.Commands.BloquearFonogramaCommand(id, commandArgs.Justificativa);
            var result = await dispatcher.SendAsync(command, ct);
            return Results.Ok(result);
        });

        group.MapPost("/{id:guid}/desbloquear", async (Guid id, IDispatcher dispatcher, CancellationToken ct) =>
        {
            var command = new Cadastro.Application.Status.Commands.DesbloquearFonogramaCommand(id);
            var result = await dispatcher.SendAsync(command, ct);
            return Results.Ok(result);
        });

        group.MapGet("/{id:guid}/historico-bloqueios", async (Guid id, IDispatcher dispatcher, CancellationToken ct) =>
        {
            var query = new Cadastro.Application.Status.Queries.HistoricoBloqueiosQuery("FONOGRAMA", id);
            var result = await dispatcher.QueryAsync(query, ct);
            return Results.Ok(result);
        });

        group.MapPatch("/{id:guid}/url-audio", async (Guid id, [FromBody] Cadastro.Application.Status.Commands.DefinirUrlAudioCommand commandArgs, IDispatcher dispatcher, CancellationToken ct) =>
        {
            var command = new Cadastro.Application.Status.Commands.DefinirUrlAudioCommand(id, commandArgs.Url);
            var result = await dispatcher.SendAsync(command, ct);
            return Results.Ok(result);
        });
    }
}

public record AtualizarFonogramaRequest(string Isrc, string PaisOrigem, DateOnly? DataGravacao, DateOnly? DataLancamento);
public record DepurarFonogramaRequest(string Isrc, string PaisOrigem, DateOnly? DataGravacao, DateOnly? DataLancamento);
