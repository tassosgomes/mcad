using Cadastro.API.Authorization;
using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Dashboard;

namespace Cadastro.API.Endpoints;

/// <summary>
/// Endpoint de resumo da dashboard para o domínio de Cadastro.
/// Retorna contagens agregadas leves para alimentar o widget da home.
/// </summary>
public static class DashboardEndpoints
{
    public static void MapDashboardEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/v1/dashboard")
            .WithTags("Dashboard");

        group.MapGet("/resumo", async (
            IDispatcher dispatcher,
            CancellationToken cancellationToken) =>
        {
            var result = await dispatcher.QueryAsync(new GetDashboardResumoQuery(), cancellationToken);
            return Results.Ok(result);
        })
        .RequireCadastroPermission(CadastroPermissions.AssociacaoListar)
        .WithName("GetDashboardResumo")
        .WithSummary("Retorna resumo agregado do domínio de Cadastro para a dashboard");
    }
}
