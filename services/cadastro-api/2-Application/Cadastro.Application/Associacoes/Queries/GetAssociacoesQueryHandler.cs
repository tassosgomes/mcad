using Cadastro.Application.Associacoes.Responses;
using Cadastro.Application.Common.CQRS;
using Cadastro.Domain.Interfaces;

namespace Cadastro.Application.Associacoes.Queries;

/// <summary>
/// Handler da query GetAssociacoesQuery — lista todas as associações.
/// Mapeia entidades para DTOs sem dependência de AutoMapper.
/// </summary>
public class GetAssociacoesQueryHandler
    : IQueryHandler<GetAssociacoesQuery, IEnumerable<AssociacaoResponse>>
{
    private readonly IAssociacaoRepository _repository;

    public GetAssociacoesQueryHandler(IAssociacaoRepository repository)
    {
        _repository = repository;
    }

    public async Task<IEnumerable<AssociacaoResponse>> HandleAsync(
        GetAssociacoesQuery query,
        CancellationToken cancellationToken)
    {
        var associacoes = await _repository.GetAllAsync(cancellationToken);
        return associacoes.Select(a => new AssociacaoResponse(a.Id, a.Sigla, a.Nome, a.Cnpj));
    }
}
