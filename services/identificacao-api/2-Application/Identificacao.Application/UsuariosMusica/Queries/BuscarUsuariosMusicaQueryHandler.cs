using Identificacao.Application.Common;
using Identificacao.Application.Common.Responses;
using Identificacao.Application.UsuariosMusica.Responses;
using Identificacao.Domain.Interfaces;

namespace Identificacao.Application.UsuariosMusica.Queries;

public class BuscarUsuariosMusicaQueryHandler
    : IQueryHandler<BuscarUsuariosMusicaQuery, UsuarioMusicaListResponse>
{
    private readonly IUsuarioMusicaSnapshotRepository _repository;

    public BuscarUsuariosMusicaQueryHandler(IUsuarioMusicaSnapshotRepository repository)
    {
        _repository = repository;
    }

    public async Task<UsuarioMusicaListResponse> HandleAsync(
        BuscarUsuariosMusicaQuery query, CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(query.Q) || query.Q.Length < 2)
            return new UsuarioMusicaListResponse(
                Array.Empty<UsuarioMusicaSnapshotResponse>(),
                new PaginationResponse(query.Page, query.Size, 0, 0));

        var (items, total) = await _repository.BuscarAsync(
            query.Q, query.Cnpj, query.Page, query.Size, cancellationToken);

        var totalPages = (int)Math.Ceiling((double)total / query.Size);

        var responses = items.Select(u => new UsuarioMusicaSnapshotResponse(
            u.Id, u.RazaoSocial, u.Cnpj));

        return new UsuarioMusicaListResponse(
            responses,
            new PaginationResponse(query.Page, query.Size, total, totalPages));
    }
}
