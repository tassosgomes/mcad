using Cadastro.Domain.Entities;

namespace Cadastro.Application.Audit;

public interface ITitularidadeAuditPublisher
{
    IReadOnlyDictionary<string, object?> Snapshot(TitularidadeAutoral titularidade);

    Task PublishAsync(
        TitularidadeAutoral titularidade,
        TitularidadeAuditOperation operation,
        IReadOnlyDictionary<string, object?>? before,
        CancellationToken cancellationToken);
}
