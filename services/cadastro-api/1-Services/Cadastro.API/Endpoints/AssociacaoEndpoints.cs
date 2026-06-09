using Cadastro.API.Authorization;
using Cadastro.Application.Associacoes.Queries;
using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Microsoft.AspNetCore.Mvc;

namespace Cadastro.API.Endpoints;

/// <summary>
/// Endpoints de Associações — apenas leitura (GET).
/// Implementa RF-04 (sem escrita) e RF-10 (405 para verbos de escrita).
/// </summary>
public static class AssociacaoEndpoints
{
    public static void MapAssociacaoEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/v1/associacoes")
            .WithTags("Associações");

        // GET /api/v1/associacoes — lista todas as associações (RF-08)
        group.MapGet("/", async (
            IDispatcher dispatcher,
            CancellationToken cancellationToken) =>
        {
            var result = await dispatcher.QueryAsync(new GetAssociacoesQuery(), cancellationToken);
            return Results.Ok(result);
        })
        .RequireCadastroPermission(CadastroPermissions.AssociacaoListar)
        .WithName("GetAssociacoes")
        .WithSummary("Lista todas as associações de gestão coletiva do ECAD");

        // GET /api/v1/associacoes/{id} — busca por ID (RF-09)
        group.MapGet("/{id:guid}", async (
            Guid id,
            IDispatcher dispatcher,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var result = await dispatcher.QueryAsync(new GetAssociacaoByIdQuery(id), cancellationToken);
                return Results.Ok(result);
            }
            catch (NotFoundException ex)
            {
                return Results.Problem(
                    detail: ex.Message,
                    statusCode: StatusCodes.Status404NotFound,
                    title: "Resource Not Found",
                    instance: $"/api/v1/associacoes/{id}");
            }
        })
        .RequireCadastroPermission(CadastroPermissions.AssociacaoVisualizar)
        .WithName("GetAssociacaoById")
        .WithSummary("Busca associação por ID");

        // Bloquear verbos de escrita com 405 Method Not Allowed (RF-04, RF-10)
        MapWriteMethodsWith405(group);
    }

    private static void MapWriteMethodsWith405(RouteGroupBuilder group)
    {
        const string blockMessage = "Associações são dados de referência e não podem ser modificados via API.";
        const string blockTitle = "Method Not Allowed";

        group.MapPost("/", () => Results.Problem(
            detail: blockMessage, statusCode: 405, title: blockTitle))
            .ExcludeFromDescription();

        group.MapPut("/{id:guid}", ([FromRoute] Guid id) => Results.Problem(
            detail: blockMessage, statusCode: 405, title: blockTitle))
            .ExcludeFromDescription();

        group.MapPatch("/{id:guid}", ([FromRoute] Guid id) => Results.Problem(
            detail: blockMessage, statusCode: 405, title: blockTitle))
            .ExcludeFromDescription();

        group.MapDelete("/{id:guid}", ([FromRoute] Guid id) => Results.Problem(
            detail: blockMessage, statusCode: 405, title: blockTitle))
            .ExcludeFromDescription();
    }
}
