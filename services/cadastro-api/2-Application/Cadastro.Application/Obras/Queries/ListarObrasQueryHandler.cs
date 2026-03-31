using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Responses;
using Cadastro.Application.Obras.Responses;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Interfaces;

namespace Cadastro.Application.Obras.Queries;

public class ListarObrasQueryHandler : IQueryHandler<ListarObrasQuery, ObraListResponse>
{
    private readonly IObraRepository _repository;

    public ListarObrasQueryHandler(IObraRepository repository)
    {
        _repository = repository;
    }

    public async Task<ObraListResponse> HandleAsync(ListarObrasQuery query, CancellationToken cancellationToken)
    {
        var filtro = new ObraFiltro(
            Page: query.Page,
            Size: query.Size,
            Sort: query.Sort,
            Titulo: query.Titulo,
            Iswc: query.Iswc,
            Tipo: query.Tipo,
            Status: query.Status,
            Genero: query.Genero);

        var (items, total) = await _repository.ListarAsync(filtro, cancellationToken);
        var totalPages = (int)Math.Ceiling((double)total / query.Size);

        return new ObraListResponse(
            Data: items.Select(MapToResponse),
            Pagination: new PaginationResponse(query.Page, query.Size, total, totalPages)
        );
    }

    internal static ObraResponse MapToResponse(ObraMusical o) => new(
        Id: o.Id,
        Titulo: o.Titulo,
        Subtitulo: o.Subtitulo,
        Tipo: vToTipoObra(o.Tipo),
        Genero: o.Genero,
        Iswc: o.Iswc,
        Status: vToStatusObra(o.Status),
        DominioPublico: o.DominioPublico,
        ObraDepuradaParaId: o.ObraDepuradaParaId,
        CriadoEm: o.CriadoEm,
        AtualizadoEm: o.AtualizadoEm
    );

    private static string vToTipoObra(Cadastro.Domain.Enums.TipoObra t)
    {
        return t == Cadastro.Domain.Enums.TipoObra.PotPourri ? "POT_POURRI" : t.ToString().ToUpperInvariant();
    }

    private static string vToStatusObra(Cadastro.Domain.Enums.StatusObra s)
    {
        return s == Cadastro.Domain.Enums.StatusObra.DominioPublico ? "DOMINIO_PUBLICO" : s.ToString().ToUpperInvariant();
    }
}
