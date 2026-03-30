using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Titulares.Responses;
using Cadastro.Domain.Interfaces;

namespace Cadastro.Application.Titulares.Queries;

/// <summary>
/// Handler para busca de titular por ID.
/// Lança NotFoundException (404) se o titular não for encontrado.
/// </summary>
public class GetTitularByIdQueryHandler : IQueryHandler<GetTitularByIdQuery, TitularResponse>
{
    private readonly ITitularRepository _repository;

    public GetTitularByIdQueryHandler(ITitularRepository repository)
    {
        _repository = repository;
    }

    public async Task<TitularResponse> HandleAsync(
        GetTitularByIdQuery query, CancellationToken cancellationToken)
    {
        var titular = await _repository.GetByIdAsync(query.Id, cancellationToken)
            ?? throw new NotFoundException("Titular", query.Id);

        return ListarTitularesQueryHandler.MapToResponse(titular);
    }
}
