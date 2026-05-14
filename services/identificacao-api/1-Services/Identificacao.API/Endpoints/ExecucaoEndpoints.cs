using Identificacao.API.Authorization;
using Identificacao.API.Infrastructure;
using Identificacao.Application.Common;
using Identificacao.Application.Execucoes.Commands;
using Identificacao.Application.Execucoes.Queries;
using Microsoft.AspNetCore.Mvc;

namespace Identificacao.API.Endpoints;

public static class ExecucaoEndpoints
{
    public static void MapExecucaoEndpoints(this IEndpointRouteBuilder app, bool authEnabled)
    {
        var group = app.MapGroup("/api/v1/captacoes/{captacaoId:guid}/execucoes")
            .WithTags("Execuções");

        // GET — Listar
        group.MapGet("/", async (
            Guid captacaoId,
            [AsParameters] ListarExecucoesQuery query,
            IDispatcher dispatcher,
            CancellationToken ct) =>
        {
            var q = query with { CaptacaoId = captacaoId };
            var result = await dispatcher.QueryAsync(q, ct);
            return Results.Ok(result);
        })
        .RequireIdentificacaoPermission(IdentificacaoPermissions.ExecucaoListar, authEnabled);

        // POST — Criar
        group.MapPost("/", async (
            Guid captacaoId,
            [FromBody] CriarExecucaoRequest request,
            HttpContext httpContext,
            IDispatcher dispatcher,
            CancellationToken ct) =>
        {
            var analistaId = httpContext.User.GetAnalistaId();

            var command = new CriarExecucaoCommand(
                captacaoId, request.ObraId, request.FonogramaId,
                request.Inicio, request.Fim, request.Quantidade,
                request.TipoUtilizacaoId, request.TituloPrograma,
                analistaId);
            var result = await dispatcher.SendAsync<Application.Execucoes.Responses.ExecucaoResponse>(command, ct);
            return Results.Created($"/api/v1/captacoes/{captacaoId}/execucoes/{result.Id}", result);
        })
        .RequireIdentificacaoPermission(IdentificacaoPermissions.ExecucaoCriar, authEnabled);

        // PUT — Atualizar
        group.MapPut("/{id:guid}", async (
            Guid captacaoId, Guid id,
            [FromBody] AtualizarExecucaoRequest request,
            HttpContext httpContext,
            IDispatcher dispatcher,
            CancellationToken ct) =>
        {
            var analistaId = httpContext.User.GetAnalistaId();

            var command = new AtualizarExecucaoCommand(
                captacaoId, id,
                request.ObraId, request.FonogramaId,
                request.Inicio, request.Fim, request.Quantidade,
                request.TipoUtilizacaoId, request.TituloPrograma,
                analistaId);
            var result = await dispatcher.SendAsync<Application.Execucoes.Responses.ExecucaoResponse>(command, ct);
            return Results.Ok(result);
        })
        .RequireIdentificacaoPermission(IdentificacaoPermissions.ExecucaoEditar, authEnabled);

        // DELETE — Excluir
        group.MapDelete("/{id:guid}", async (
            Guid captacaoId, Guid id,
            HttpContext httpContext,
            IDispatcher dispatcher,
            CancellationToken ct) =>
        {
            var analistaId = httpContext.User.GetAnalistaId();

            await dispatcher.SendAsync<bool>(new ExcluirExecucaoCommand(captacaoId, id, analistaId), ct);
            return Results.NoContent();
        })
        .RequireIdentificacaoPermission(IdentificacaoPermissions.ExecucaoExcluir, authEnabled);
    }
}

public record CriarExecucaoRequest(
    Guid ObraId, Guid? FonogramaId,
    TimeOnly Inicio, TimeOnly Fim, int Quantidade,
    Guid? TipoUtilizacaoId, string? TituloPrograma);

public record AtualizarExecucaoRequest(
    Guid ObraId, Guid? FonogramaId,
    TimeOnly Inicio, TimeOnly Fim, int Quantidade,
    Guid? TipoUtilizacaoId, string? TituloPrograma);
