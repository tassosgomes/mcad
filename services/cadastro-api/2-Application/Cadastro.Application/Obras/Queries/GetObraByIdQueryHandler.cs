using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Obras.Responses;
using Cadastro.Domain.Interfaces;

namespace Cadastro.Application.Obras.Queries;

public class GetObraByIdQueryHandler : IQueryHandler<GetObraByIdQuery, ObraResponse>
{
    private readonly IObraRepository _repository;

    public GetObraByIdQueryHandler(IObraRepository repository)
    {
        _repository = repository;
    }

    public async Task<ObraResponse> HandleAsync(GetObraByIdQuery query, CancellationToken cancellationToken)
    {
        var obra = await _repository.GetByIdAsync(query.Id, cancellationToken);

        if (obra == null)
            throw new NotFoundException("Obra não encontrada.", query.Id);

        return ListarObrasQueryHandler.MapToResponse(obra);
    }
}
