using Cadastro.API.Authorization;
using Cadastro.Application.Busca.Queries;
using Cadastro.Application.Common.CQRS;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace Cadastro.API.Endpoints;

public static class BuscaEndpoints
{
    public static void MapBuscaEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/busca").WithTags("Busca");

        group.MapGet("/", async ([AsParameters] BuscaCadastroQuery query, IDispatcher dispatcher, CancellationToken ct) =>
        {
            var result = await dispatcher.QueryAsync(query, ct);
            return Results.Ok(result);
        })
        .RequireCadastroPermission(CadastroPermissions.ObraListar);
    }
}
