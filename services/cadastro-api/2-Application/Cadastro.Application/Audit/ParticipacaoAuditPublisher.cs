using Cadastro.Domain.Entities;
using Ecad.Audit.Sdk;

namespace Cadastro.Application.Audit;

public sealed class ParticipacaoAuditPublisher : IParticipacaoAuditPublisher
{
    private readonly IAuditClient _auditClient;
    private readonly ParticipacaoAuditEventFactory _eventFactory;
    private readonly IAuditContextProvider _contextProvider;

    public ParticipacaoAuditPublisher(
        IAuditClient auditClient,
        ParticipacaoAuditEventFactory eventFactory,
        IAuditContextProvider contextProvider)
    {
        _auditClient = auditClient;
        _eventFactory = eventFactory;
        _contextProvider = contextProvider;
    }

    public IReadOnlyDictionary<string, object?> Snapshot(ParticipacaoConexa p) => _eventFactory.Map(p);

    public async Task PublishAsync(
        ParticipacaoConexa participacao,
        ParticipacaoAuditOperation operation,
        IReadOnlyDictionary<string, object?>? before,
        CancellationToken cancellationToken)
    {
        var context = _contextProvider.Current();
        await _auditClient.PublishAsync(_eventFactory.UserAction(participacao, context, operation), cancellationToken);
        await _auditClient.PublishAsync(_eventFactory.DataChange(participacao, context, operation, before), cancellationToken);
    }
}
