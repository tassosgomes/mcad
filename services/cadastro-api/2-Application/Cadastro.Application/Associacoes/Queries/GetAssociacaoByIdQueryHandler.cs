using Cadastro.Application.Associacoes.Responses;
using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Interfaces;

namespace Cadastro.Application.Associacoes.Queries;

/// <summary>
/// Handler da query GetAssociacaoByIdQuery.
/// Lança NotFoundException (→ HTTP 404) se a associação não for encontrada.
/// </summary>
public class GetAssociacaoByIdQueryHandler
    : IQueryHandler<GetAssociacaoByIdQuery, AssociacaoResponse>
{
    private readonly IAssociacaoRepository _repository;

    public GetAssociacaoByIdQueryHandler(IAssociacaoRepository repository)
    {
        _repository = repository;
    }

    public async Task<AssociacaoResponse> HandleAsync(
        GetAssociacaoByIdQuery query,
        CancellationToken cancellationToken)
    {
        var associacao = await _repository.GetByIdAsync(query.Id, cancellationToken);

        if (associacao is null)
            throw new NotFoundException(nameof(Associacao), query.Id);

        return new AssociacaoResponse(associacao.Id, associacao.Codigo, associacao.Sigla, associacao.Nome, associacao.Cnpj);
    }
}
