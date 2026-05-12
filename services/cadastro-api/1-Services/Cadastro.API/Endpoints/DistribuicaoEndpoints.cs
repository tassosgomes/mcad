using Cadastro.API.Authorization;
using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Distribuicao.Queries;
using Microsoft.AspNetCore.Mvc;

namespace Cadastro.API.Endpoints;

public static class DistribuicaoEndpoints
{
    public static void MapDistribuicaoEndpoints(this IEndpointRouteBuilder app, bool authEnabled)
    {
        var group = app
            .MapGroup("/api/v1/distribuicao")
            .WithTags("Distribuição");

        group.MapPost("/ownership-snapshot", async (
            [FromBody] OwnershipSnapshotRequest request,
            IDispatcher dispatcher,
            CancellationToken ct) =>
        {
            var query = new ObterOwnershipSnapshotQuery(request.ObraIds ?? [], request.FonogramaIds ?? []);
            var result = await dispatcher.QueryAsync(query, ct);
            return Results.Ok(result);
        })
        .RequireCadastroPermission(CadastroPermissions.TitularidadeListar, authEnabled);
    }
}

public record OwnershipSnapshotRequest(
    IReadOnlyCollection<Guid>? ObraIds,
    IReadOnlyCollection<Guid>? FonogramaIds);
