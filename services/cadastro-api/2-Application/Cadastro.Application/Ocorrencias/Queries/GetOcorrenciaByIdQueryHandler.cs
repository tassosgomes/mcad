using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Portal.Commands;
using Cadastro.Application.Portal.Responses;
using Cadastro.Domain.Interfaces;

namespace Cadastro.Application.Ocorrencias.Queries;

/// <summary>
/// Obtém uma ocorrência pelo Id (RF-33).
/// </summary>
public class GetOcorrenciaByIdQueryHandler
    : IQueryHandler<GetOcorrenciaByIdQuery, OcorrenciaResponse>
{
    private readonly IOcorrenciaRepository _repository;

    public GetOcorrenciaByIdQueryHandler(IOcorrenciaRepository repository)
    {
        _repository = repository;
    }

    public async Task<OcorrenciaResponse> HandleAsync(
        GetOcorrenciaByIdQuery query, CancellationToken cancellationToken)
    {
        var ocorrencia = await _repository.GetByIdAsync(query.Id, cancellationToken)
            ?? throw new NotFoundException("Ocorrencia", query.Id);

        return CriarOcorrenciaCommandHandler.MapToResponse(ocorrencia);
    }
}
