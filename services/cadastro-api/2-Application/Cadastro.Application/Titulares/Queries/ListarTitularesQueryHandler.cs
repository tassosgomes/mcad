using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Responses;
using Cadastro.Application.Titulares.Responses;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Interfaces;

namespace Cadastro.Application.Titulares.Queries;

/// <summary>
/// Handler para listagem paginada de titulares.
/// Delega ao repositório, mapeia entidades para DTOs.
/// </summary>
public class ListarTitularesQueryHandler : IQueryHandler<ListarTitularesQuery, TitularListResponse>
{
    private readonly ITitularRepository _repository;

    public ListarTitularesQueryHandler(ITitularRepository repository)
    {
        _repository = repository;
    }

    public async Task<TitularListResponse> HandleAsync(
        ListarTitularesQuery query, CancellationToken cancellationToken)
    {
        var filtro = new TitularFiltro(
            Page: query.Page,
            Size: query.Size,
            Sort: query.Sort,
            Nome: query.Nome,
            Documento: query.Documento,
            AssociacaoId: query.AssociacaoId,
            Status: query.Status);

        var (items, total) = await _repository.ListarAsync(filtro, cancellationToken);

        var totalPages = (int)Math.Ceiling((double)total / query.Size);

        return new TitularListResponse(
            Data: items.Select(MapToResponse),
            Pagination: new PaginationResponse(query.Page, query.Size, total, totalPages));
    }

    internal static TitularResponse MapToResponse(Titular t) => new(
        Id: t.Id,
        Nome: t.Nome,
        Tipo: t.Tipo.ToString(),
        Documento: t.Documento,
        DocumentoFormatado: t.DocumentoFormatado,
        Nacionalidade: t.Nacionalidade,
        CaeIpi: t.CaeIpi?.Valor,
        Associacao: new AssociacaoResumoResponse(t.Associacao.Id, t.Associacao.Sigla, t.Associacao.Nome),
        Status: t.Status.ToString().ToUpperInvariant(),
        CriadoEm: t.CriadoEm,
        AtualizadoEm: t.AtualizadoEm);
}
