using Cadastro.Domain.Entities;

namespace Cadastro.Application.Audit;

public interface IFonogramaAuditPublisher
{
    IReadOnlyDictionary<string, object?> Snapshot(Fonograma fonograma);

    Task PublishAsync(
        Fonograma fonograma,
        FonogramaAuditOperation operation,
        IReadOnlyDictionary<string, object?>? before,
        CancellationToken cancellationToken);
}
