using Cadastro.API.Authorization;
using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Solicitacoes.Commands;
using Cadastro.Application.Solicitacoes.Queries;
using Microsoft.AspNetCore.Mvc;

namespace Cadastro.API.Endpoints;

/// <summary>
/// Endpoints de aprovação/rejeição de solicitações de alteração pelo Analista (RF-16, RF-18, RF-19).
/// <para>
/// Prefixo <c>/api/v1/solicitacoes-alteracao</c>. Authentication scheme default (Keycloak).
/// Cada endpoint exige uma permission específica via <c>RequireCadastroPermission</c>.
/// </para>
/// </summary>
public static class SolicitacaoAlteracaoEndpoints
{
    public static void MapSolicitacaoAlteracaoEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/v1/solicitacoes-alteracao").WithTags("Solicitações de Alteração — Analista");

        // GET /api/v1/solicitacoes-alteracao — lista todas para o painel do analista.
        group.MapGet("/", async (
            [AsParameters] ListarSolicitacoesQuery query,
            IDispatcher dispatcher,
            CancellationToken ct) =>
        {
            var result = await dispatcher.QueryAsync(query, ct);
            return Results.Ok(result);
        })
        .RequireCadastroPermission(CadastroPermissions.SolicitacaoAlteracaoListar)
        .WithName("ListarSolicitacoesAlteracao")
        .WithSummary("Lista todas as solicitações de alteração para o painel do analista");

        // POST /api/v1/solicitacoes-alteracao/{id}/aprovar — aprova (RF-16, RF-18).
        group.MapPost("/{id:guid}/aprovar", async (
            Guid id,
            IDispatcher dispatcher,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var analistaId = ParseAnalistaId(httpContext);

            var command = new AprovarSolicitacaoCommand(id, analistaId);
            var result = await dispatcher.SendAsync(command, ct);
            return Results.Ok(result);
        })
        .RequireCadastroPermission(CadastroPermissions.SolicitacaoAlteracaoAprovar)
        .WithName("AprovarSolicitacaoAlteracao")
        .WithSummary("Aprova uma solicitação de alteração de dado sensível (aplica efeito no titular)");

        // POST /api/v1/solicitacoes-alteracao/{id}/rejeitar — rejeita (RF-19).
        group.MapPost("/{id:guid}/rejeitar", async (
            Guid id,
            [FromBody] RejeitarSolicitacaoRequest request,
            IDispatcher dispatcher,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var analistaId = ParseAnalistaId(httpContext);

            var command = new RejeitarSolicitacaoCommand(id, request.JustificativaRejeicao, analistaId);
            var result = await dispatcher.SendAsync(command, ct);
            return Results.Ok(result);
        })
        .RequireCadastroPermission(CadastroPermissions.SolicitacaoAlteracaoRejeitar)
        .WithName("RejeitarSolicitacaoAlteracao")
        .WithSummary("Rejeita uma solicitação de alteração com justificativa (sem efeito no titular)");
    }

    private static Guid ParseAnalistaId(HttpContext httpContext)
    {
        var sub = httpContext.User.FindFirst("sub")?.Value;
        return Guid.TryParse(sub, out var analistaId) ? analistaId : Guid.Empty;
    }
}

/// <summary>Body da rejeição de solicitação de alteração (RF-19). AnalistaId vem do JWT.</summary>
public record RejeitarSolicitacaoRequest(string JustificativaRejeicao);
