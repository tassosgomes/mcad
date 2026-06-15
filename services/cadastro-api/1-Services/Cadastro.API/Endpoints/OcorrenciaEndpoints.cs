using Cadastro.API.Authorization;
using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Ocorrencias.Commands;
using Cadastro.Application.Ocorrencias.Queries;
using Microsoft.AspNetCore.Mvc;

namespace Cadastro.API.Endpoints;

/// <summary>
/// Endpoints de triagem e resolução de ocorrências pelo analista (RF-33 a RF-39).
/// <para>
/// Prefixo <c>/api/v1/ocorrencias</c>. Authentication scheme default (Keycloak).
/// Cada endpoint exige uma permission específica via <c>RequireCadastroPermission</c>.
/// </para>
/// <para>
/// <c>analistaId</c> é extraído do claim <c>sub</c> do JWT (RF-38 — usado apenas para
/// auditoria/log estruturado, não persistido na entidade).
/// </para>
/// <para>
/// Estado: <c>ABERTA → EM_ANALISE → RESOLVIDA | CANCELADA</c>. O domínio rejeita
/// transições inválidas (RF-37).
/// </para>
/// </summary>
public static class OcorrenciaEndpoints
{
    public static void MapOcorrenciaEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/v1/ocorrencias").WithTags("Ocorrências — Triagem");

        // GET /api/v1/ocorrencias — RF-33: lista todas (sem isolamento por titular).
        group.MapGet("/", async (
            [AsParameters] ListarOcorrenciasQuery query,
            IDispatcher dispatcher,
            CancellationToken ct) =>
        {
            var result = await dispatcher.QueryAsync(query, ct);
            return Results.Ok(result);
        })
        .RequireCadastroPermission(CadastroPermissions.OcorrenciaListar)
        .WithName("ListarOcorrencias")
        .WithSummary("Lista todas as ocorrências para triagem (filtros opcionais)");

        // GET /api/v1/ocorrencias/{id} — RF-33: detalhe de uma ocorrência.
        group.MapGet("/{id:guid}", async (Guid id, IDispatcher dispatcher, CancellationToken ct) =>
        {
            var result = await dispatcher.QueryAsync(new GetOcorrenciaByIdQuery(id), ct);
            return Results.Ok(result);
        })
        .RequireCadastroPermission(CadastroPermissions.OcorrenciaVisualizar)
        .WithName("ObterOcorrencia")
        .WithSummary("Detalha uma ocorrência por Id");

        // POST /api/v1/ocorrencias/{id}/analisar — RF-34: ABERTA → EM_ANALISE.
        group.MapPost("/{id:guid}/analisar", async (
            Guid id,
            IDispatcher dispatcher,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var analistaId = ParseAnalistaId(httpContext);

            var command = new AnalisarOcorrenciaCommand(id, analistaId);
            var result = await dispatcher.SendAsync(command, ct);
            return Results.Ok(result);
        })
        .RequireCadastroPermission(CadastroPermissions.OcorrenciaAnalisar)
        .WithName("AnalisarOcorrencia")
        .WithSummary("Assume a análise de uma ocorrência (ABERTA → EM_ANALISE)");

        // POST /api/v1/ocorrencias/{id}/resolver — RF-35, RF-39: EM_ANALISE → RESOLVIDA.
        group.MapPost("/{id:guid}/resolver", async (
            Guid id,
            [FromBody] ResolverOcorrenciaRequest request,
            IDispatcher dispatcher,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var analistaId = ParseAnalistaId(httpContext);

            var command = new ResolverOcorrenciaCommand(id, analistaId, request.Parecer);
            var result = await dispatcher.SendAsync(command, ct);
            return Results.Ok(result);
        })
        .RequireCadastroPermission(CadastroPermissions.OcorrenciaResolver)
        .WithName("ResolverOcorrencia")
        .WithSummary("Resolve uma ocorrência (EM_ANALISE → RESOLVIDA) com parecer");

        // POST /api/v1/ocorrencias/{id}/cancelar — RF-36: ABERTA|EM_ANALISE → CANCELADA.
        group.MapPost("/{id:guid}/cancelar", async (
            Guid id,
            [FromBody] CancelarOcorrenciaRequest request,
            IDispatcher dispatcher,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var analistaId = ParseAnalistaId(httpContext);

            var command = new CancelarOcorrenciaCommand(id, analistaId, request.Justificativa);
            var result = await dispatcher.SendAsync(command, ct);
            return Results.Ok(result);
        })
        .RequireCadastroPermission(CadastroPermissions.OcorrenciaCancelar)
        .WithName("CancelarOcorrencia")
        .WithSummary("Cancela uma ocorrência com justificativa (ABERTA|EM_ANALISE → CANCELADA)");
    }

    /// <summary>
    /// Extrai o analistaId do claim <c>sub</c> do JWT (RF-38 — auditoria).
    /// Mesmo padrão de <c>AnexoEndpoints</c> para <c>uploadadoPor</c>.
    /// </summary>
    private static Guid ParseAnalistaId(HttpContext httpContext)
    {
        var sub = httpContext.User.FindFirst("sub")?.Value;
        return Guid.TryParse(sub, out var analistaId) ? analistaId : Guid.Empty;
    }
}

/// <summary>Body da resolução de ocorrência (RF-35). AnalistaId vem do JWT.</summary>
public record ResolverOcorrenciaRequest(string Parecer);

/// <summary>Body do cancelamento de ocorrência (RF-36). AnalistaId vem do JWT.</summary>
public record CancelarOcorrenciaRequest(string Justificativa);
