using Cadastro.API.Authorization;
using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Titularidades.Commands;
using Cadastro.Application.Titularidades.Queries;
using Microsoft.AspNetCore.Mvc;

namespace Cadastro.API.Endpoints;

public static class TitularidadeEndpoints
{
    public static void MapTitularidadeEndpoints(this IEndpointRouteBuilder app, bool authEnabled)
    {
        var obrasGroup = app.MapGroup("/api/v1/obras").WithTags("Titularidades Autorais");

        obrasGroup.MapGet("/{obraId:guid}/titularidades", async (Guid obraId, IDispatcher dispatcher, CancellationToken ct) =>
        {
            var result = await dispatcher.QueryAsync(new ListarTitularidadesQuery(obraId), ct);
            return Results.Ok(result);
        })
        .RequireCadastroPermission(CadastroPermissions.TitularidadeListar, authEnabled);

        obrasGroup.MapPost("/{obraId:guid}/titularidades", async (Guid obraId, [FromBody] AdicionarTitularidadeRequest request, IDispatcher dispatcher, CancellationToken ct) =>
        {
            var command = new AdicionarTitularidadeCommand(obraId, request.TitularId, request.Categoria, request.Percentual);
            var result = await dispatcher.SendAsync(command, ct);
            return Results.Created($"/api/v1/obras/{obraId}/titularidades", result);
        })
        .RequireCadastroPermission(CadastroPermissions.TitularidadeAdicionar, authEnabled);

        obrasGroup.MapPut("/{obraId:guid}/titularidades/{id:guid}", async (Guid obraId, Guid id, [FromBody] EditarTitularidadeRequest request, IDispatcher dispatcher, CancellationToken ct) =>
        {
            var command = new EditarTitularidadeCommand(obraId, id, request.Percentual);
            var result = await dispatcher.SendAsync(command, ct);
            return Results.Ok(result);
        })
        .RequireCadastroPermission(CadastroPermissions.TitularidadeEditar, authEnabled);

        obrasGroup.MapDelete("/{obraId:guid}/titularidades/{id:guid}", async (Guid obraId, Guid id, IDispatcher dispatcher, CancellationToken ct) =>
        {
            var command = new RemoverTitularidadeCommand(obraId, id);
            var result = await dispatcher.SendAsync(command, ct);
            return Results.Ok(result);
        })
        .RequireCadastroPermission(CadastroPermissions.TitularidadeRemover, authEnabled);

        var titularesGroup = app.MapGroup("/api/v1/titulares").WithTags("Autocomplete Titulares");

        titularesGroup.MapGet("/busca", async ([AsParameters] BuscarTitularesQuery query, IDispatcher dispatcher, CancellationToken ct) =>
        {
            var result = await dispatcher.QueryAsync(query, ct);
            return Results.Ok(result);
        })
        .RequireCadastroPermission(CadastroPermissions.TitularidadeBuscar, authEnabled);
    }
}

public record AdicionarTitularidadeRequest(Guid TitularId, string Categoria, decimal Percentual);
public record EditarTitularidadeRequest(decimal Percentual);
