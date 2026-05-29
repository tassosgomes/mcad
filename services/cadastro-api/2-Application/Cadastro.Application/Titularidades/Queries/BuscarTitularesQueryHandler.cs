using Cadastro.Application.Common.Authorization;
using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Titulares;
using Cadastro.Application.Titularidades.Responses;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;

namespace Cadastro.Application.Titularidades.Queries;

public class BuscarTitularesQueryHandler : IQueryHandler<BuscarTitularesQuery, IEnumerable<TitularResumoResponse>>
{
    private readonly ITitularRepository _repository;
    private readonly ICurrentUserPermissions _permissions;

    public BuscarTitularesQueryHandler(ITitularRepository repository, ICurrentUserPermissions permissions)
    {
        _repository = repository;
        _permissions = permissions;
    }

    public async Task<IEnumerable<TitularResumoResponse>> HandleAsync(BuscarTitularesQuery query, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(query.Q) || query.Q.Length < 2)
            return Enumerable.Empty<TitularResumoResponse>();

        var titulares = await _repository.BuscarParaAutocompleteAsync(query.Q, query.Limit, cancellationToken);
        var fullDocumentAllowed = _permissions.Has(CadastroPermissionNames.TitularVerCpfCompleto);

        return titulares.Select(t => new TitularResumoResponse(
            t.Id,
            t.Codigo,
            t.Nome,
            t.Tipo.ToString().ToUpperInvariant(),
            DocumentoMasking.Apply(t.Documento, t.DocumentoFormatado, fullDocumentAllowed).DocumentoFormatado,
            t.Associacao?.Sigla
        ));
    }
}
