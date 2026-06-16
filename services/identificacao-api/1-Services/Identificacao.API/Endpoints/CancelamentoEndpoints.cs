using Identificacao.API.Authorization;
using Identificacao.API.Infrastructure;
using Identificacao.Application.Cancelamento.Commands;
using Identificacao.Application.Cancelamento.Queries;
using Identificacao.Application.Common;
using Microsoft.AspNetCore.Mvc;

namespace Identificacao.API.Endpoints;

public record CancelarRolRequest(string Justificativa, string OpcaoRecriacao);

public static class CancelamentoEndpoints
{
    public static void MapCancelamentoEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/captacoes/{captacaoId:guid}")
            .WithTags("Cancelamento");

        group.MapGet("/pode-cancelar", async (
            Guid captacaoId,
            IDispatcher dispatcher,
            CancellationToken ct) =>
        {
            var result = await dispatcher.QueryAsync(new PodeCancelarQuery(captacaoId), ct);
            return Results.Ok(result);
        }).RequireIdentificacaoPermission(IdentificacaoPermissions.CaptacaoVisualizar);

        group.MapPost("/cancelar", async (
            Guid captacaoId,
            [FromBody] CancelarRolRequest request,
            HttpContext httpContext,
            IDispatcher dispatcher,
            CancellationToken ct) =>
        {
            var analistaId = httpContext.User.GetAnalistaId();
            var analistaNome = httpContext.User.GetAnalistaNomeClaim() ?? "Desconhecido";

            var command = new CancelarRolCommand(
                captacaoId,
                request.Justificativa,
                request.OpcaoRecriacao,
                analistaId,
                analistaNome);

            var result = await dispatcher.SendAsync(command, ct);
            return Results.Ok(result);
        }).RequireIdentificacaoPermission(IdentificacaoPermissions.CaptacaoCancelar);
    }
}
