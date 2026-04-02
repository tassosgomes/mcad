using Identificacao.Application.Common;
using Identificacao.Application.Rubricas.Queries;

namespace Identificacao.API.Endpoints;

public static class RubricaEndpoints
{
    public static void MapRubricaEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/rubricas")
            .WithTags("Rubricas");

        group.MapGet("/", async (
            IDispatcher dispatcher,
            CancellationToken ct) =>
        {
            var query = new ListarRubricasQuery();
            var result = await dispatcher.QueryAsync(query, ct);
            return Results.Ok(result);
        })
        .RequireAuthorization("read");
    }
}
