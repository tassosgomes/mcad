using Cadastro.Application.Common.Authorization;
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
    private readonly ICurrentUserPermissions _permissions;

    public ListarTitularesQueryHandler(ITitularRepository repository, ICurrentUserPermissions permissions)
    {
        _repository = repository;
        _permissions = permissions;
    }

    public async Task<TitularListResponse> HandleAsync(
        ListarTitularesQuery query, CancellationToken cancellationToken)
    {
        var filtro = new TitularFiltro(
            Page: query.Page,
            Size: query.Size,
            Sort: query.Sort,
            Codigo: query.Codigo,
            Nome: query.Nome,
            Documento: query.Documento,
            AssociacaoId: query.AssociacaoId,
            Status: query.Status);

        var (items, total) = await _repository.ListarAsync(filtro, cancellationToken);

        var totalPages = (int)Math.Ceiling((double)total / query.Size);

        var fullDocumentAllowed = await _permissions.HasAsync(CadastroPermissionNames.TitularVerCpfCompleto);

        return new TitularListResponse(
            Data: items.Select(item => MapToResponse(item, fullDocumentAllowed)),
            Pagination: new PaginationResponse(query.Page, query.Size, total, totalPages));
    }

    internal static TitularResponse MapToResponse(Titular t, bool fullDocumentAllowed)
    {
        var (documento, documentoFormatado) = DocumentoMasking.Apply(
            t.Documento,
            t.DocumentoFormatado,
            fullDocumentAllowed);

        return new TitularResponse(
        Id: t.Id,
        Codigo: t.Codigo,
        Nome: t.Nome,
        Tipo: t.Tipo.ToString(),
        Documento: documento,
        DocumentoFormatado: documentoFormatado,
        Nacionalidade: t.Nacionalidade,
        CaeIpi: t.CaeIpi?.Valor,
        Associacao: new AssociacaoResumoResponse(t.Associacao.Id, t.Associacao.Codigo, t.Associacao.Sigla, t.Associacao.Nome),
        Status: t.Status.ToString().ToUpperInvariant(),
        CriadoEm: t.CriadoEm,
        AtualizadoEm: t.AtualizadoEm);
    }
}
