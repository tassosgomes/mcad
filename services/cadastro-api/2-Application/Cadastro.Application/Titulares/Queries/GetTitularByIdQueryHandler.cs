using Cadastro.Application.Common.Authorization;
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
    private readonly ICurrentUserPermissions _permissions;

    public GetTitularByIdQueryHandler(ITitularRepository repository, ICurrentUserPermissions permissions)
    {
        _repository = repository;
        _permissions = permissions;
    }

    public async Task<TitularResponse> HandleAsync(
        GetTitularByIdQuery query, CancellationToken cancellationToken)
    {
        var titular = await _repository.GetByIdAsync(query.Id, cancellationToken)
            ?? throw new NotFoundException("Titular", query.Id);

        var fullDocumentAllowed = _permissions.Has(CadastroPermissionNames.TitularVerCpfCompleto);

        return ListarTitularesQueryHandler.MapToResponse(titular, fullDocumentAllowed);
    }
}
