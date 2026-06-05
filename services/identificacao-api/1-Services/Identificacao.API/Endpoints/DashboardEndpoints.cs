using Identificacao.API.Authorization;
using Identificacao.Application.Common;
using Identificacao.Application.Dashboard;

namespace Identificacao.API.Endpoints;

/// <summary>
/// Endpoint de resumo da dashboard para o domínio de Identificação.
/// Retorna métricas agregadas para alimentar o widget da home.
/// </summary>
public static class DashboardEndpoints
{
    public static void MapDashboardEndpoints(this IEndpointRouteBuilder app, bool authEnabled)
    {
        var group = app.MapGroup("/api/v1/dashboard")
            .WithTags("Dashboard");

        group.MapGet("/resumo", async (
            IDispatcher dispatcher,
            CancellationToken ct) =>
        {
            var result = await dispatcher.QueryAsync(new GetDashboardResumoQuery(), ct);
            return Results.Ok(result);
        })
        .RequireIdentificacaoPermission(IdentificacaoPermissions.CaptacaoListar, authEnabled)
        .WithName("GetDashboardResumo")
        .WithSummary("Retorna resumo agregado do domínio de Identificação para a dashboard");
    }
}
