using Cadastro.Application.Audit;
using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Domain.Interfaces;

namespace Cadastro.Application.Titulares.Commands;

/// <summary>
/// Handler para exclusão de titular.
/// Verifica vínculos (RF-23) — bloqueia com ConflictException se existirem.
/// </summary>
public class ExcluirTitularCommandHandler : ICommandHandler<ExcluirTitularCommand, bool>
{
    private readonly ITitularRepository _repository;
    private readonly ITitularAuditPublisher _auditPublisher;

    public ExcluirTitularCommandHandler(
        ITitularRepository repository,
        ITitularAuditPublisher auditPublisher)
    {
        _repository = repository;
        _auditPublisher = auditPublisher;
    }

    public async Task<bool> HandleAsync(
        ExcluirTitularCommand command, CancellationToken cancellationToken)
    {
        // 1. Buscar titular
        var titular = await _repository.GetByIdAsync(command.Id, cancellationToken)
            ?? throw new NotFoundException("Titular", command.Id);

        // 2. Verificar vínculos (RF-23) — tabelas F04/F06 (retorna false por ora)
        var possuiVinculos = await _repository.PossuiVinculosAsync(command.Id, cancellationToken);
        if (possuiVinculos)
            throw new ConflictException(
                "Titular não pode ser excluído pois possui vínculos com obras ou fonogramas");

        // 3. Excluir e persistir
        var before = _auditPublisher.Snapshot(titular);
        _repository.Delete(titular);
        await _auditPublisher.PublishAsync(titular, TitularAuditOperation.Delete, before, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return true;
    }
}
