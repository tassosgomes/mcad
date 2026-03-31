using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Titularidades.Responses;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;

namespace Cadastro.Application.Titularidades.Queries;

public class BuscarTitularesQueryHandler : IQueryHandler<BuscarTitularesQuery, IEnumerable<TitularResumoResponse>>
{
    private readonly ITitularRepository _repository;

    public BuscarTitularesQueryHandler(ITitularRepository repository)
    {
        _repository = repository;
    }

    public async Task<IEnumerable<TitularResumoResponse>> HandleAsync(BuscarTitularesQuery query, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(query.Q) || query.Q.Length < 2)
            return Enumerable.Empty<TitularResumoResponse>();

        var titulares = await _repository.BuscarParaAutocompleteAsync(query.Q, query.Limit, cancellationToken);

        return titulares.Select(t => new TitularResumoResponse(
            t.Id,
            t.Nome,
            t.Tipo.ToString().ToUpperInvariant(),
            t.DocumentoFormatado,
            t.Associacao?.Sigla
        ));
    }
}
