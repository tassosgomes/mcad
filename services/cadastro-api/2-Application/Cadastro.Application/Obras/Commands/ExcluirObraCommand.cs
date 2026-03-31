using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;

namespace Cadastro.Application.Obras.Commands;

public record ExcluirObraCommand(Guid Id) : ICommand<bool>;

public class ExcluirObraCommandHandler : ICommandHandler<ExcluirObraCommand, bool>
{
    private readonly IObraRepository _repository;

    public ExcluirObraCommandHandler(IObraRepository repository)
    {
        _repository = repository;
    }

    public async Task<bool> HandleAsync(ExcluirObraCommand request, CancellationToken cancellationToken)
    {
        var obra = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("Obra não encontrada.", request.Id);

        if (obra.Status == StatusObra.Depurada)
            throw new ConflictException("Obras depuradas não podem ser excluídas.");

        if (await _repository.PossuiVinculosAsync(obra.Id, cancellationToken))
            throw new ConflictException("A obra possui vínculos e não pode ser excluída.");

        _repository.Delete(obra);
        await _repository.SaveChangesAsync(cancellationToken);
        
        return true;
    }
}
