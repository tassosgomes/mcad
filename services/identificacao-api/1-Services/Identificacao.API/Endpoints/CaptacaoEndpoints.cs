using Identificacao.API.Authorization;
using Identificacao.API.Infrastructure;
using Identificacao.Application.Common;
using Identificacao.Application.Captacoes.Commands;
using Identificacao.Application.Captacoes.Queries;
using Microsoft.AspNetCore.Mvc;

namespace Identificacao.API.Endpoints;

public record CriarCaptacaoRequest(Guid RubricaId, DateOnly Periodo, Guid UsuarioMusicaId, string UsuarioMusicaNome);
public record AtualizarCaptacaoRequest(Guid RubricaId, DateOnly Periodo, Guid UsuarioMusicaId, string UsuarioMusicaNome);

public static class CaptacaoEndpoints
{
    public static void MapCaptacaoEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/captacoes")
            .WithTags("Captações");

        group.MapGet("/", async (
            [FromQuery] Guid? rubricaId,
            [FromQuery] DateOnly? periodoInicial,
            [FromQuery] DateOnly? periodoFinal,
            [FromQuery] string? status,
            [FromQuery] Guid? analistaResponsavelId,
            [FromQuery] Guid? usuarioMusicaId,
            [FromQuery] string? sort,
            [FromQuery] int? page,
            [FromQuery] int? size,
            IDispatcher dispatcher,
            CancellationToken ct) =>
        {
            var query = new ListarCaptacoesQuery(
                rubricaId, periodoInicial, periodoFinal, status, analistaResponsavelId, usuarioMusicaId, sort, page ?? 1, size ?? 10);

            var result = await dispatcher.QueryAsync(query, ct);
            return Results.Ok(result);
        })
        .RequireIdentificacaoPermission(IdentificacaoPermissions.CaptacaoListar);

        group.MapGet("/{id:guid}", async (
            Guid id,
            IDispatcher dispatcher,
            CancellationToken ct) =>
        {
            var query = new GetCaptacaoByIdQuery(id);
            var result = await dispatcher.QueryAsync(query, ct);
            return Results.Ok(result);
        })
        .RequireIdentificacaoPermission(IdentificacaoPermissions.CaptacaoVisualizar);

        group.MapPost("/", async (
            [FromBody] CriarCaptacaoRequest request,
            HttpContext httpContext,
            IDispatcher dispatcher,
            CancellationToken ct) =>
        {
            var analistaId = httpContext.User.GetAnalistaId();
            var analistaSubject = httpContext.User.GetAnalistaSubject();
            var analistaNomeClaim = httpContext.User.GetAnalistaNomeClaim();

            var command = new CriarCaptacaoCommand(
                request.RubricaId, request.Periodo, request.UsuarioMusicaId, request.UsuarioMusicaNome,
                analistaId, analistaSubject, analistaNomeClaim);

            var result = await dispatcher.SendAsync(command, ct);
            return Results.Created($"/api/v1/captacoes/{result.Id}", result);
        })
        .RequireIdentificacaoPermission(IdentificacaoPermissions.CaptacaoCriar);

        group.MapPut("/{id:guid}", async (
            Guid id,
            [FromBody] AtualizarCaptacaoRequest request,
            HttpContext httpContext,
            IDispatcher dispatcher,
            CancellationToken ct) =>
        {
            var analistaId = httpContext.User.GetAnalistaId();

            var command = new AtualizarCaptacaoCommand(
                id, request.RubricaId, request.Periodo, request.UsuarioMusicaId, request.UsuarioMusicaNome, analistaId);

            var result = await dispatcher.SendAsync(command, ct);
            return Results.Ok(result);
        })
        .RequireIdentificacaoPermission(IdentificacaoPermissions.CaptacaoEditar);

        group.MapDelete("/{id:guid}", async (
            Guid id,
            HttpContext httpContext,
            IDispatcher dispatcher,
            CancellationToken ct) =>
        {
            var analistaId = httpContext.User.GetAnalistaId();

            var command = new ExcluirCaptacaoCommand(id, analistaId);

            await dispatcher.SendAsync(command, ct);
            return Results.NoContent();
        })
        .RequireIdentificacaoPermission(IdentificacaoPermissions.CaptacaoExcluir);

        group.MapPost("/manutencao/reprocessar-responsaveis", async (
            IDispatcher dispatcher,
            CancellationToken ct) =>
        {
            var result = await dispatcher.SendAsync(
                new ReprocessarResponsaveisDesconhecidosCommand(), ct);
            return Results.Ok(result);
        })
        .RequireIdentificacaoPermission(IdentificacaoPermissions.CaptacaoManutencao);
    }
}
