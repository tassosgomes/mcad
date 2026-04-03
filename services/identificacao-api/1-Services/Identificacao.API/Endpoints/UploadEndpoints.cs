using System;
using System.Threading;
using Identificacao.Application.Common;
using Identificacao.Application.Uploads.Commands;
using Identificacao.Application.Uploads.Queries;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace Identificacao.API.Endpoints;

public static class UploadEndpoints
{
    public static void MapUploadEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/captacoes/{captacaoId:guid}/uploads")
            .WithTags("Uploads CSV");

        group.MapPost("/", async (
            Guid captacaoId,
            IFormFile arquivo,
            HttpContext httpContext,
            IDispatcher dispatcher,
            CancellationToken ct) =>
        {
            var analistaId = Guid.Parse(httpContext.User.FindFirst("sub")?.Value ?? Guid.Empty.ToString());
            using var stream = arquivo.OpenReadStream();

            var command = new CriarUploadCommand(captacaoId, arquivo.FileName, stream, analistaId);
            var result = await dispatcher.SendAsync(command, ct);
            return Results.Accepted($"/api/v1/captacoes/{captacaoId}/uploads/{result.Id}", result);
        })
        .RequireAuthorization("write")
        .DisableAntiforgery();

        group.MapGet("/", async (
            Guid captacaoId,
            int page, int size,
            IDispatcher dispatcher,
            CancellationToken ct) =>
        {
            page = page > 0 ? page : 1;
            size = size > 0 ? size : 10;
            var result = await dispatcher.QueryAsync(
                new ListarUploadsQuery(captacaoId, page, size), ct);
            return Results.Ok(result);
        })
        .RequireAuthorization("read");

        group.MapGet("/{id:guid}", async (
            Guid captacaoId, Guid id,
            IDispatcher dispatcher,
            CancellationToken ct) =>
        {
            var result = await dispatcher.QueryAsync(
                new GetUploadByIdQuery(captacaoId, id), ct);
            return Results.Ok(result);
        })
        .RequireAuthorization("read");

        group.MapGet("/{id:guid}/erros", async (
            Guid captacaoId, Guid id,
            int page, int size,
            IDispatcher dispatcher,
            CancellationToken ct) =>
        {
            page = page > 0 ? page : 1;
            size = size > 0 ? size : 10;
            var result = await dispatcher.QueryAsync(
                // Note: The query requires UploadId. The id from path is UploadId!
                new ListarErrosUploadQuery(id, page, size), ct);
            return Results.Ok(result);
        })
        .RequireAuthorization("read");
    }
}
