using Identificacao.API.Authorization;
using Identificacao.Application.Common;
using Identificacao.Application.Identidade.Queries;

namespace Identificacao.API.Endpoints;

public static class AnalistaEndpoints
{
    public static void MapAnalistaEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/analistas")
            .WithTags("Analistas");

        group.MapGet("/", async (
            IDispatcher dispatcher,
            CancellationToken ct) =>
        {
            var query = new ListarAnalistasQuery();
            var result = await dispatcher.QueryAsync(query, ct);
            return Results.Ok(result);
        })
        .RequireIdentificacaoPermission(IdentificacaoPermissions.AnalistaListar);
    }
}
