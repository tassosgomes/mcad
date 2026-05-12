using Cadastro.API.Authorization;
using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Titulares.Commands;
using Cadastro.Application.Titulares.Queries;
using Cadastro.Domain.Enums;
using Microsoft.AspNetCore.Mvc;

namespace Cadastro.API.Endpoints;

/// <summary>
/// Endpoints CRUD para Titulares — 5 rotas: GET (lista), POST (criar),
/// GET (por ID), PUT (atualizar), DELETE (excluir).
/// Conforme api-contract.yaml.
/// </summary>
public static class TitularEndpoints
{
    public static void MapTitularEndpoints(this WebApplication app, bool authEnabled)
    {
        var group = app.MapGroup("/api/v1/titulares")
            .WithTags("Titulares");

        group.MapGet("/", ListarTitulares)
            .RequireCadastroPermission(CadastroPermissions.TitularListar, authEnabled)
            .WithName("ListarTitulares")
            .WithSummary("Listar titulares com paginação, filtros e ordenação");

        group.MapPost("/", CriarTitular)
            .RequireCadastroPermission(CadastroPermissions.TitularCriar, authEnabled)
            .WithName("CriarTitular")
            .WithSummary("Criar novo titular PF ou PJ");

        group.MapGet("/{id:guid}", BuscarPorId)
            .RequireCadastroPermission(CadastroPermissions.TitularVisualizar, authEnabled)
            .WithName("BuscarTitularPorId")
            .WithSummary("Buscar titular por ID");

        group.MapPut("/{id:guid}", AtualizarTitular)
            .RequireCadastroPermission(CadastroPermissions.TitularEditar, authEnabled)
            .WithName("AtualizarTitular")
            .WithSummary("Atualizar dados editáveis do titular");

        group.MapDelete("/{id:guid}", ExcluirTitular)
            .RequireCadastroPermission(CadastroPermissions.TitularExcluir, authEnabled)
            .WithName("ExcluirTitular")
            .WithSummary("Excluir titular (se sem vínculos)");
    }

    /// <summary>GET /api/v1/titulares — listagem paginada</summary>
    private static async Task<IResult> ListarTitulares(
        [FromServices] IDispatcher dispatcher,
        [FromQuery] int page = 1,
        [FromQuery] int size = 20,
        [FromQuery] string? sort = "nome",
        [FromQuery] long? codigo = null,
        [FromQuery] string? nome = null,
        [FromQuery] string? documento = null,
        [FromQuery] Guid? associacaoId = null,
        [FromQuery] string? status = null,
        CancellationToken cancellationToken = default)
    {
        StatusTitular? statusEnum = null;
        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<StatusTitular>(status, true, out var parsed))
            statusEnum = parsed;

        var query = new ListarTitularesQuery(page, size, sort, codigo, nome, documento, associacaoId, statusEnum);
        var result = await dispatcher.QueryAsync(query, cancellationToken);

        return Results.Ok(result);
    }

    /// <summary>POST /api/v1/titulares — criar titular</summary>
    private static async Task<IResult> CriarTitular(
        [FromServices] IDispatcher dispatcher,
        [FromBody] CriarTitularRequest request,
        CancellationToken cancellationToken = default)
    {
        var command = new CriarTitularCommand(
            request.Nome,
            request.Tipo,
            request.Documento,
            request.Nacionalidade,
            request.AssociacaoId,
            request.CaeIpi);

        var result = await dispatcher.SendAsync(command, cancellationToken);

        return Results.Created($"/api/v1/titulares/{result.Id}", result);
    }

    /// <summary>GET /api/v1/titulares/{id} — buscar por ID</summary>
    private static async Task<IResult> BuscarPorId(
        [FromServices] IDispatcher dispatcher,
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var query = new GetTitularByIdQuery(id);
        var result = await dispatcher.QueryAsync(query, cancellationToken);
        return Results.Ok(result);
    }

    /// <summary>PUT /api/v1/titulares/{id} — atualizar titular</summary>
    private static async Task<IResult> AtualizarTitular(
        [FromServices] IDispatcher dispatcher,
        Guid id,
        [FromBody] AtualizarTitularRequest request,
        CancellationToken cancellationToken = default)
    {
        var command = new AtualizarTitularCommand(
            id,
            request.Nome,
            request.Nacionalidade,
            request.AssociacaoId,
            request.Status,
            request.CaeIpi);

        var result = await dispatcher.SendAsync(command, cancellationToken);
        return Results.Ok(result);
    }

    /// <summary>DELETE /api/v1/titulares/{id} — excluir titular</summary>
    private static async Task<IResult> ExcluirTitular(
        [FromServices] IDispatcher dispatcher,
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var command = new ExcluirTitularCommand(id);
        await dispatcher.SendAsync(command, cancellationToken);
        return Results.NoContent();
    }
}

/// <summary>Request body para criação de titular</summary>
public record CriarTitularRequest(
    string Nome,
    string Tipo,
    string Documento,
    string Nacionalidade,
    Guid AssociacaoId,
    string? CaeIpi);

/// <summary>Request body para atualização de titular</summary>
public record AtualizarTitularRequest(
    string Nome,
    string Nacionalidade,
    Guid AssociacaoId,
    string Status,
    string? CaeIpi);
