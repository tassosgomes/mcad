using Identificacao.API.Authorization;
using Identificacao.Application.Common;
using Identificacao.Application.Pendentes.Commands;
using Identificacao.Application.Pendentes.Queries;
using Identificacao.Application.Pendentes.Responses;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;

namespace Identificacao.API.Endpoints;

public static class PendenteEndpoints
{
    public static void MapPendenteEndpoints(this IEndpointRouteBuilder app, bool authEnabled)
    {
        var group = app.MapGroup("/api/v1/pendentes").WithTags("Pendentes");

        group.MapGet("/", async ([AsParameters] ListarPendentesQuery query,
            IDispatcher dispatcher, CancellationToken ct) =>
        {
            var result = await dispatcher.QueryAsync(query, ct);
            return Results.Ok(result);
        }).RequireIdentificacaoPermission(IdentificacaoPermissions.PendenteListar, authEnabled);

        group.MapGet("/impacto", async ([AsParameters] ListarImpactoPendentesQuery query,
            IDispatcher dispatcher, CancellationToken ct) =>
        {
            var result = await dispatcher.QueryAsync(query, ct);
            return Results.Ok(result);
        }).RequireIdentificacaoPermission(IdentificacaoPermissions.PendenteVisualizarImpacto, authEnabled);

        group.MapPost("/{id:guid}/resolver", async (
            Guid id, [FromBody] ResolverPendenteRequest request,
            HttpContext httpContext, IDispatcher dispatcher, CancellationToken ct) =>
        {
            var command = new ResolverPendenteCommand(id, request.ObraId, request.FonogramaId);
            var result = await dispatcher.SendAsync(command, ct);
            return Results.Ok(result);
        }).RequireIdentificacaoPermission(IdentificacaoPermissions.PendenteResolver, authEnabled);

        group.MapPost("/resolver-lote", async (
            [FromBody] ResolverLoteRequest request,
            HttpContext httpContext, IDispatcher dispatcher, CancellationToken ct) =>
        {
            var command = new ResolverPendentesEmLoteCommand(
                request.ExecucaoIds.Select(id => new ExecucaoTarget(Guid.Empty, id)).ToList(),
                request.ObraId,
                request.FonogramaId);
            var result = await dispatcher.SendAsync(command, ct);
            return Results.Ok(result);
        }).RequireIdentificacaoPermission(IdentificacaoPermissions.PendenteResolver, authEnabled);
    }
}

public record ResolverPendenteRequest(Guid ObraId, Guid? FonogramaId);
public record ResolverLoteRequest(List<Guid> ExecucaoIds, Guid ObraId, Guid? FonogramaId);
