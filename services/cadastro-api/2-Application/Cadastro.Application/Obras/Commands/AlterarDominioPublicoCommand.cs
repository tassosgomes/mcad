using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Obras.Queries;
using Cadastro.Application.Obras.Responses;
using Cadastro.Domain.Interfaces;

namespace Cadastro.Application.Obras.Commands;

public record AlterarDominioPublicoCommand(Guid Id, bool DominioPublico) : ICommand<ObraResponse>;

public class AlterarDominioPublicoCommandHandler : ICommandHandler<AlterarDominioPublicoCommand, ObraResponse>
{
    private readonly IObraRepository _repository;

    public AlterarDominioPublicoCommandHandler(IObraRepository repository)
    {
        _repository = repository;
    }

    public async Task<ObraResponse> HandleAsync(AlterarDominioPublicoCommand request, CancellationToken cancellationToken)
    {
        var obra = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("Obra não encontrada.", request.Id);

        obra.MarcarDominioPublico(request.DominioPublico);
        
        _repository.Update(obra);
        await _repository.SaveChangesAsync(cancellationToken);

        return ListarObrasQueryHandler.MapToResponse(obra);
    }
}
