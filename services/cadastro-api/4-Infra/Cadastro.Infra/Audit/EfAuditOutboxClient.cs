using System.Text.Json;
using Cadastro.Infra.Data;
using Ecad.Audit.Contract;
using Ecad.Audit.Sdk;

namespace Cadastro.Infra.Audit;

public sealed class EfAuditOutboxClient : IAuditClient
{
    private readonly CadastroDbContext _context;
    private readonly JsonSerializerOptions _jsonOptions;

    public EfAuditOutboxClient(CadastroDbContext context, JsonSerializerOptions jsonOptions)
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
