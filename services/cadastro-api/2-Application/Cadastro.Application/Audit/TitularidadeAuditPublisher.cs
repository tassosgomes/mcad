using Cadastro.Domain.Entities;
using Ecad.Audit.Sdk;

namespace Cadastro.Application.Audit;

public sealed class TitularidadeAuditPublisher : ITitularidadeAuditPublisher
{
    private readonly IAuditClient _auditClient;
    private readonly TitularidadeAuditEventFactory _eventFactory;
    private readonly IAuditContextProvider _contextProvider;

    public TitularidadeAuditPublisher(
        IAuditClient auditClient,
        TitularidadeAuditEventFactory eventFactory,
        IAuditContextProvider contextProvider)
    {
        _auditClient = auditClient;
        _eventFactory = eventFactory;
        _contextProvider = contextProvider;
    }

    public IReadOnlyDictionary<string, object?> Snapshot(TitularidadeAutoral t) =>
        _eventFactory.Map(t);

    public async Task PublishAsync(
        TitularidadeAutoral titularidade,
        TitularidadeAuditOperation operation,
        IReadOnlyDictionary<string, object?>? before,
        CancellationToken cancellationToken)
    {
        var context = _contextProvider.Current();
        await _auditClient.PublishAsync(_eventFactory.UserAction(titularidade, context, operation), cancellationToken);
        await _auditClient.PublishAsync(_eventFactory.DataChange(titularidade, context, operation, before), cancellationToken);
    }
}
