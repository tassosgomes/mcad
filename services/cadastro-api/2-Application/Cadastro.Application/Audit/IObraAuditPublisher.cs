using Cadastro.Domain.Entities;

namespace Cadastro.Application.Audit;

public interface IObraAuditPublisher
{
    IReadOnlyDictionary<string, object?> Snapshot(ObraMusical obra);

    Task PublishAsync(
        ObraMusical obra,
        ObraAuditOperation operation,
        IReadOnlyDictionary<string, object?>? before,
        CancellationToken cancellationToken);
}
