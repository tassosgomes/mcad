using Identificacao.API.Authorization;
using Identificacao.Application.Common;
using Identificacao.Application.UsuariosMusica.Queries;
using Microsoft.AspNetCore.Mvc;

namespace Identificacao.API.Endpoints;

public static class UsuarioMusicaEndpoints
{
    public static void MapUsuarioMusicaEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/usuarios-musica")
            .WithTags("Usuários de Música");

        group.MapGet("/", async (
            [FromQuery] string? q,
            [FromQuery] string? cnpj,
            [FromQuery] int? page,
            [FromQuery] int? size,
            IDispatcher dispatcher,
            CancellationToken ct) =>
        {
            var query = new BuscarUsuariosMusicaQuery(q, cnpj, page ?? 1, size ?? 10);
            var result = await dispatcher.QueryAsync(query, ct);
            return Results.Ok(result);
        })
        .RequireIdentificacaoPermission(IdentificacaoPermissions.UsuarioMusicaListar);
    }
}
