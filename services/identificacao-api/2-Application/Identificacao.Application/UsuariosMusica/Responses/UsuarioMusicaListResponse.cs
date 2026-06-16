using Identificacao.Application.Common.Responses;

namespace Identificacao.Application.UsuariosMusica.Responses;

public record UsuarioMusicaListResponse(
    IEnumerable<UsuarioMusicaSnapshotResponse> Items,
    PaginationResponse Pagination
);
