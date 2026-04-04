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
        }).RequireAuthorization("read");

        group.MapPost("/fechar", async (Guid captacaoId,
            HttpContext httpContext, IDispatcher dispatcher, CancellationToken ct) =>
        {
            var userIdStr = httpContext.User.FindFirst("sub")?.Value 
                         ?? httpContext.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var analistaId))
            {
                // Fallback provisório caso não use IAM (ou ambiente local sem setup auth)
                analistaId = Guid.Empty; 
            }

            var result = await dispatcher.SendAsync(new FecharRolCommand(captacaoId, analistaId), ct);
            return Results.Ok(result);
        }).RequireAuthorization("write");
    }
}
