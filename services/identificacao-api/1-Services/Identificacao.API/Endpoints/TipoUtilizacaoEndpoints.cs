using Identificacao.Application.Common;
using Identificacao.Application.TiposUtilizacao.Queries;
using Microsoft.AspNetCore.Mvc;

namespace Identificacao.API.Endpoints;

public static class TipoUtilizacaoEndpoints
{
    public static void MapTipoUtilizacaoEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/tipos-utilizacao")
            .WithTags("Tipos de Utilização");

        group.MapGet("/", async (
            IDispatcher dispatcher,
            CancellationToken ct) =>
        {
            var result = await dispatcher.QueryAsync(new ListarTiposUtilizacaoQuery(), ct);
            return Results.Ok(result);
        })
        .RequireAuthorization("read");
    }
}
