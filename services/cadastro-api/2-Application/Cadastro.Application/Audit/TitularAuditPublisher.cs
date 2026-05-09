using Cadastro.Domain.Entities;
using Ecad.Audit.Sdk;

namespace Cadastro.Application.Audit;

public sealed class TitularAuditPublisher : ITitularAuditPublisher
{
    private readonly IAuditClient _auditClient;
    private readonly TitularAuditEventFactory _eventFactory;
    private readonly IAuditContextProvider _contextProvider;

    public TitularAuditPublisher(
        IAuditClient auditClient,
        TitularAuditEventFactory eventFactory,
        IAuditContextProvider contextProvider)
    {
        _auditClient = auditClient;
        _eventFactory = eventFactory;
        _contextProvider = contextProvider;
    }

    public IReadOnlyDictionary<string, object?> Snapshot(Titular titular) =>
        _eventFactory.TitularMap(titular);

    public async Task PublishAsync(
        Titular titular,
        TitularAuditOperation operation,
        IReadOnlyDictionary<string, object?>? before,
        CancellationToken cancellationToken)
    {
        var context = _contextProvider.Current();
        await _auditClient.PublishAsync(_eventFactory.UserAction(titular, context, operation), cancellationToken);
        await _auditClient.PublishAsync(_eventFactory.DataChange(titular, context, operation, before), cancellationToken);
    }
}
