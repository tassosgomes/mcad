using Cadastro.Domain.Entities;
using Ecad.Audit.Sdk;

namespace Cadastro.Application.Audit;

public sealed class FonogramaAuditPublisher : IFonogramaAuditPublisher
{
    private readonly IAuditClient _auditClient;
    private readonly FonogramaAuditEventFactory _eventFactory;
    private readonly IAuditContextProvider _contextProvider;

    public FonogramaAuditPublisher(
        IAuditClient auditClient,
        FonogramaAuditEventFactory eventFactory,
        IAuditContextProvider contextProvider)
    {
        _auditClient = auditClient;
        _eventFactory = eventFactory;
        _contextProvider = contextProvider;
    }

    public IReadOnlyDictionary<string, object?> Snapshot(Fonograma fonograma) =>
        _eventFactory.FonogramaMap(fonograma);

    public async Task PublishAsync(
        Fonograma fonograma,
        FonogramaAuditOperation operation,
        IReadOnlyDictionary<string, object?>? before,
        CancellationToken cancellationToken)
    {
        var context = _contextProvider.Current();
        await _auditClient.PublishAsync(_eventFactory.UserAction(fonograma, context, operation), cancellationToken);
        await _auditClient.PublishAsync(_eventFactory.DataChange(fonograma, context, operation, before), cancellationToken);
    }
}
