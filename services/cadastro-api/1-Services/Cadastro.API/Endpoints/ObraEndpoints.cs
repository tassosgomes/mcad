using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Obras.Commands;
using Cadastro.Application.Obras.Queries;
using Microsoft.AspNetCore.Mvc;

namespace Cadastro.API.Endpoints;

public static class ObraEndpoints
{
    public static void MapObraEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/obras").WithTags("Obras");

        group.MapGet("/", async ([AsParameters] ListarObrasQuery query, IDispatcher dispatcher, CancellationToken ct) =>
        {
            var result = await dispatcher.QueryAsync(query, ct);
            return Results.Ok(result);
        })
        .RequireAuthorization("read");

        group.MapPost("/", async ([FromBody] CriarObraCommand command, IDispatcher dispatcher, CancellationToken ct) =>
        {
            var result = await dispatcher.SendAsync(command, ct);
            return Results.Created($"/api/v1/obras/{result.Id}", result);
        })
        .RequireAuthorization("write");

        group.MapGet("/{id:guid}", async (Guid id, IDispatcher dispatcher, CancellationToken ct) =>
        {
            var result = await dispatcher.QueryAsync(new GetObraByIdQuery(id), ct);
            return Results.Ok(result);
        })
        .RequireAuthorization("read");

        group.MapPut("/{id:guid}", async (Guid id, [FromBody] AtualizarObraRequest request, IDispatcher dispatcher, CancellationToken ct) =>
        {
            var command = new AtualizarObraCommand(id, request.Titulo, request.Subtitulo, request.Tipo, request.Genero);
            var result = await dispatcher.SendAsync(command, ct);
            return Results.Ok(result);
        })
        .RequireAuthorization("write");

        group.MapDelete("/{id:guid}", async (Guid id, IDispatcher dispatcher, CancellationToken ct) =>
        {
            await dispatcher.SendAsync(new ExcluirObraCommand(id), ct);
            return Results.NoContent();
        })
        .RequireAuthorization("write");

        group.MapPost("/{id:guid}/iswc", async (Guid id, IDispatcher dispatcher, CancellationToken ct) =>
        {
            var result = await dispatcher.SendAsync(new ObterIswcCommand(id), ct);
            return Results.Ok(result);
        })
        .RequireAuthorization("write");

        group.MapPost("/{id:guid}/depurar", async (Guid id, [FromBody] DepurarObraRequest request, IDispatcher dispatcher, CancellationToken ct) =>
        {
            var command = new DepurarObraCommand(id, request.Titulo, request.Tipo, request.Subtitulo, request.Genero);
            var result = await dispatcher.SendAsync(command, ct);
            return Results.Created($"/api/v1/obras/{result.NovaObra.Id}", result);
        })
        .RequireAuthorization("write");

        group.MapPut("/{id:guid}/dominio-publico", async (Guid id, [FromBody] AlterarDominioPublicoRequest request, IDispatcher dispatcher, CancellationToken ct) =>
        {
            var command = new AlterarDominioPublicoCommand(id, request.DominioPublico);
            var result = await dispatcher.SendAsync(command, ct);
            return Results.Ok(result);
        })
        .RequireAuthorization("write");

        group.MapPost("/{id:guid}/liberar", async (Guid id, IDispatcher dispatcher, CancellationToken ct) =>
        {
            var command = new Cadastro.Application.Status.Commands.LiberarObraCommand(id);
            var result = await dispatcher.SendAsync(command, ct);
            return Results.Ok(result);
        })
        .RequireAuthorization("write");

        group.MapPost("/{id:guid}/bloquear", async (Guid id, [FromBody] BloquearObraRequest? request, IDispatcher dispatcher, CancellationToken ct) =>
        {
            if (request is null)
            {
                throw new Cadastro.Application.Common.Exceptions.ValidationException(new Dictionary<string, string[]>
                {
                    ["body"] = ["Body é obrigatório."]
                });
            }

            var command = new Cadastro.Application.Status.Commands.BloquearObraCommand(id, request.Justificativa);
            var result = await dispatcher.SendAsync(command, ct);
            return Results.Ok(result);
        })
        .RequireAuthorization("write");

        group.MapPost("/{id:guid}/desbloquear", async (Guid id, IDispatcher dispatcher, CancellationToken ct) =>
        {
            var command = new Cadastro.Application.Status.Commands.DesbloquearObraCommand(id);
            var result = await dispatcher.SendAsync(command, ct);
            return Results.Ok(result);
        })
        .RequireAuthorization("write");

        group.MapGet("/{id:guid}/historico-bloqueios", async (Guid id, IDispatcher dispatcher, CancellationToken ct) =>
        {
            var query = new Cadastro.Application.Status.Queries.HistoricoBloqueiosQuery("OBRA", id);
            var result = await dispatcher.QueryAsync(query, ct);
            return Results.Ok(result);
        })
        .RequireAuthorization("read");
    }
}

public record AtualizarObraRequest(string Titulo, string? Subtitulo, string Tipo, string? Genero);
public record DepurarObraRequest(string Titulo, string Tipo, string? Subtitulo, string? Genero);
public record AlterarDominioPublicoRequest(bool DominioPublico);
public record BloquearObraRequest(string Justificativa);
