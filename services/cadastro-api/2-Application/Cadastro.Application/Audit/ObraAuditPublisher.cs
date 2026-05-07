using Cadastro.Domain.Entities;
using Ecad.Audit.Sdk;

namespace Cadastro.Application.Audit;

public sealed class ObraAuditPublisher : IObraAuditPublisher
{
    private readonly IAuditClient _auditClient;
    private readonly ObraAuditEventFactory _eventFactory;
    private readonly IAuditContextProvider _contextProvider;

    public ObraAuditPublisher(
        IAuditClient auditClient,
        ObraAuditEventFactory eventFactory,
        IAuditContextProvider contextProvider)
    {
        _auditClient = auditClient;
        _eventFactory = eventFactory;
        _contextProvider = contextProvider;
    }

    public IReadOnlyDictionary<string, object?> Snapshot(ObraMusical obra)
    {
        return _eventFactory.ObraMap(obra);
    }

    public async Task PublishAsync(
        ObraMusical obra,
        ObraAuditOperation operation,
        IReadOnlyDictionary<string, object?>? before,
        CancellationToken cancellationToken)
    {
        var context = _contextProvider.Current();
        await _auditClient.PublishAsync(_eventFactory.UserAction(obra, context, operation), cancellationToken);
        await _auditClient.PublishAsync(_eventFactory.DataChange(obra, context, operation, before), cancellationToken);
    }
}
