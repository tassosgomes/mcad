using Cadastro.Domain.Entities;

namespace Cadastro.Application.Audit;

public interface ITitularAuditPublisher
{
    IReadOnlyDictionary<string, object?> Snapshot(Titular titular);

    Task PublishAsync(
        Titular titular,
        TitularAuditOperation operation,
        IReadOnlyDictionary<string, object?>? before,
        CancellationToken cancellationToken);
}
