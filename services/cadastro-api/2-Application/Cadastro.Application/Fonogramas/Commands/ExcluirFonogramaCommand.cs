using Cadastro.Application.Audit;
using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Domain.Interfaces;

namespace Cadastro.Application.Fonogramas.Commands;

public record ExcluirFonogramaCommand(Guid Id) : ICommand<bool>;

public class ExcluirFonogramaCommandHandler : ICommandHandler<ExcluirFonogramaCommand, bool>
{
    private readonly IFonogramaRepository _fonogramaRepository;
    private readonly IFonogramaAuditPublisher _auditPublisher;

    public ExcluirFonogramaCommandHandler(
        IFonogramaRepository fonogramaRepository,
        IFonogramaAuditPublisher auditPublisher)
    {
        _fonogramaRepository = fonogramaRepository;
        _auditPublisher = auditPublisher;
    }

    public async Task<bool> HandleAsync(ExcluirFonogramaCommand command, CancellationToken cancellationToken)
    {
        var fonograma = await _fonogramaRepository.GetByIdAsync(command.Id, cancellationToken);

        if (fonograma == null)
            throw new NotFoundException("Fonograma não encontrado.", command.Id);

        if (!fonograma.PodeSerExcluido)
            throw new ConflictException("Fonogramas liberados ou depurados não podem ser excluídos.");

        var before = _auditPublisher.Snapshot(fonograma);

        _fonogramaRepository.Delete(fonograma);
        await _auditPublisher.PublishAsync(fonograma, FonogramaAuditOperation.Delete, before, cancellationToken);
        await _fonogramaRepository.SaveChangesAsync(cancellationToken);

        return true;
    }
}
