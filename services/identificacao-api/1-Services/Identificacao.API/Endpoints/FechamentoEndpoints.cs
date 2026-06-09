using Identificacao.API.Authorization;
using Identificacao.API.Infrastructure;
using Identificacao.Application.Common;
using Identificacao.Application.Fechamento.Commands;
using Identificacao.Application.Fechamento.Queries;
using Microsoft.AspNetCore.Mvc;

namespace Identificacao.API.Endpoints;

public static class FechamentoEndpoints
{
    public static void MapFechamentoEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/captacoes/{captacaoId:guid}")
            .WithTags("Fechamento do Rol");

        group.MapGet("/pre-requisitos", async (Guid captacaoId,
            IDispatcher dispatcher, CancellationToken ct) =>
        {
            var result = await dispatcher.QueryAsync(new ValidarPreRequisitosQuery(captacaoId), ct);
            return Results.Ok(result);
        }).RequireIdentificacaoPermission(IdentificacaoPermissions.CaptacaoVisualizar);

        group.MapPost("/fechar", async (Guid captacaoId,
            HttpContext httpContext, IDispatcher dispatcher, CancellationToken ct) =>
        {
            var analistaId = httpContext.User.GetAnalistaId();

            var result = await dispatcher.SendAsync(new FecharRolCommand(captacaoId, analistaId), ct);
            return Results.Ok(result);
        }).RequireIdentificacaoPermission(IdentificacaoPermissions.CaptacaoFechar);
    }
}
