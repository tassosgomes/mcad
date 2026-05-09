using Cadastro.Domain.Entities;

namespace Cadastro.Application.Audit;

public interface IParticipacaoAuditPublisher
{
    IReadOnlyDictionary<string, object?> Snapshot(ParticipacaoConexa participacao);

    Task PublishAsync(
        ParticipacaoConexa participacao,
        ParticipacaoAuditOperation operation,
        IReadOnlyDictionary<string, object?>? before,
        CancellationToken cancellationToken);
}
