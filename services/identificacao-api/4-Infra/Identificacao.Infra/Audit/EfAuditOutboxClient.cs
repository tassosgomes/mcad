using System.Text.Json;
using Ecad.Audit.Contract;
using Ecad.Audit.Sdk;
using Identificacao.Infra.Data;

namespace Identificacao.Infra.Audit;

public sealed class EfAuditOutboxClient : IAuditClient
{
    private readonly IdentificacaoDbContext _context;
    private readonly JsonSerializerOptions _jsonOptions;

    public EfAuditOutboxClient(IdentificacaoDbContext context, JsonSerializerOptions jsonOptions)
    {
        _context = context;
        _jsonOptions = jsonOptions;
    }

    public Task<AuditPublishResult> PublishAsync(AuditEvent auditEvent, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(auditEvent);

        _context.AuditOutboxEvents.Add(AuditOutboxEvent.Create(
            auditEvent.EventId,
            auditEvent.EventType.ToString(),
            auditEvent.Data?.EntityType,
            auditEvent.Data?.EntityId,
            JsonSerializer.Serialize(auditEvent, _jsonOptions)));

        return Task.FromResult(AuditPublishResult.AcceptedResult(auditEvent.EventId));
    }
}
