using Cadastro.API.Authorization;
using Cadastro.Application.Anexos.Commands;
using Cadastro.Application.Anexos.Queries;
using Cadastro.Application.Common.CQRS;
using Cadastro.Domain.Enums;
using Microsoft.AspNetCore.Mvc;

namespace Cadastro.API.Endpoints;

/// <summary>
/// Endpoints de Anexos — upload, listagem, metadados, download e remoção.
/// Mesmo padrão repetido para obras, fonogramas e titulares.
/// Upload simples: máx 100 MB (limite do storage-service).
/// </summary>
public static class AnexoEndpoints
{
    public static void MapAnexoEndpoints(this WebApplication app)
    {
        MapParaEntidade(app, "/api/v1/obras/{entidadeId:guid}/anexos",      TipoEntidadeAnexo.Obra,      "Anexos - Obras");
        MapParaEntidade(app, "/api/v1/fonogramas/{entidadeId:guid}/anexos", TipoEntidadeAnexo.Fonograma, "Anexos - Fonogramas");
        MapParaEntidade(app, "/api/v1/titulares/{entidadeId:guid}/anexos",  TipoEntidadeAnexo.Titular,   "Anexos - Titulares");
    }

    private static void MapParaEntidade(
        WebApplication app, string prefixo, TipoEntidadeAnexo tipo, string tag)
    {
        var group = app.MapGroup(prefixo).WithTags(tag);

        group.MapGet("/", async (Guid entidadeId, IDispatcher dispatcher, CancellationToken ct) =>
        {
            var result = await dispatcher.QueryAsync(new ListarAnexosQuery(tipo, entidadeId), ct);
            return Results.Ok(result);
        })
        .RequireCadastroPermission(CadastroPermissions.AnexoListar)
        .WithName($"ListarAnexos{tipo}")
        .WithSummary($"Listar anexos de {tipo}");

        group.MapPost("/", async (
            Guid entidadeId,
            IFormFile arquivo,
            [FromForm] string categoria,
            IDispatcher dispatcher,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            if (!Enum.TryParse<CategoriaAnexo>(categoria, ignoreCase: true, out var categoriaEnum))
                return Results.BadRequest(new { error = $"Categoria inválida: '{categoria}'." });

            var uploadadoPor = httpContext.User.FindFirst("sub")?.Value ?? "desconhecido";

            await using var stream = arquivo.OpenReadStream();
            var command = new AnexarArquivoCommand(
                tipo,
                entidadeId,
                categoriaEnum,
                stream,
                arquivo.FileName,
                arquivo.ContentType ?? "application/octet-stream",
                arquivo.Length,
                uploadadoPor);

            var result = await dispatcher.SendAsync(command, ct);
            return Results.Created($"{prefixo.Replace("{entidadeId:guid}", entidadeId.ToString())}/{result.Id}", result);
        })
        .RequireCadastroPermission(CadastroPermissions.AnexoUpload)
        .WithName($"UploadAnexo{tipo}")
        .WithSummary($"Upload de anexo para {tipo} (máx 100 MB)")
        .DisableAntiforgery();

        group.MapGet("/{anexoId:guid}", async (Guid entidadeId, Guid anexoId, IDispatcher dispatcher, CancellationToken ct) =>
        {
            var result = await dispatcher.QueryAsync(new ObterMetadadosAnexoQuery(tipo, entidadeId, anexoId), ct);
            return Results.Ok(result);
        })
        .RequireCadastroPermission(CadastroPermissions.AnexoVisualizar)
        .WithName($"ObterAnexo{tipo}")
        .WithSummary($"Metadados de Anexo de {tipo} (sincroniza status de scan)");

        group.MapGet("/{anexoId:guid}/download", async (Guid entidadeId, Guid anexoId, IDispatcher dispatcher, CancellationToken ct) =>
        {
            var result = await dispatcher.QueryAsync(new ObterDownloadUrlQuery(tipo, entidadeId, anexoId), ct);
            return Results.Ok(result);
        })
        .RequireCadastroPermission(CadastroPermissions.AnexoDownload)
        .WithName($"DownloadAnexo{tipo}")
        .WithSummary($"Obter URL presigned de download (válida 15 min) — requer status clean");

        group.MapDelete("/{anexoId:guid}", async (Guid entidadeId, Guid anexoId, IDispatcher dispatcher, CancellationToken ct) =>
        {
            await dispatcher.SendAsync(new RemoverAnexoCommand(tipo, entidadeId, anexoId), ct);
            return Results.NoContent();
        })
        .RequireCadastroPermission(CadastroPermissions.AnexoRemover)
        .WithName($"RemoverAnexo{tipo}")
        .WithSummary($"Remover Anexo de {tipo} (soft delete + remove do storage)");
    }
}
