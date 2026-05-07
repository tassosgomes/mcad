using Cadastro.Application.Audit;
using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;

namespace Cadastro.Application.Obras.Commands;

public record ExcluirObraCommand(Guid Id) : ICommand<bool>;

public class ExcluirObraCommandHandler : ICommandHandler<ExcluirObraCommand, bool>
{
    private readonly IObraRepository _repository;
    private readonly IObraAuditPublisher _auditPublisher;

    public ExcluirObraCommandHandler(IObraRepository repository, IObraAuditPublisher auditPublisher)
    {
        _repository = repository;
        _auditPublisher = auditPublisher;
    }

    public async Task<bool> HandleAsync(ExcluirObraCommand request, CancellationToken cancellationToken)
    {
        var obra = await _repository.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException("Obra não encontrada.", request.Id);

        if (obra.Status == StatusObra.Depurada)
            throw new ConflictException("Obras depuradas não podem ser excluídas.");

        if (await _repository.PossuiVinculosAsync(obra.Id, cancellationToken))
            throw new ConflictException("Obra não pode ser excluída pois possui titularidades autorais vinculadas.");

        var before = _auditPublisher.Snapshot(obra);
        _repository.Delete(obra);
        await _auditPublisher.PublishAsync(obra, ObraAuditOperation.Delete, before, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);
        
        return true;
    }
}
