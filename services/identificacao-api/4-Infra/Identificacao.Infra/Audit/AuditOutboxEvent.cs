namespace Identificacao.Infra.Audit;

public class AuditOutboxEvent
{
    public string Id { get; private set; } = string.Empty;
    public string EventId { get; private set; } = string.Empty;
    public string EventType { get; private set; } = string.Empty;
    public string? AggregateType { get; private set; }
    public string? AggregateId { get; private set; }
    public string PayloadJson { get; private set; } = string.Empty;
    public string Status { get; private set; } = "PENDING";
    public DateTime CreatedAtUtc { get; private set; }
    public DateTime AvailableAtUtc { get; private set; }
    public DateTime? SentAtUtc { get; private set; }
    public DateTime? LockedUntilUtc { get; private set; }
    public string? LockOwner { get; private set; }
    public int RetryCount { get; private set; }
    public string? LastError { get; private set; }

    private AuditOutboxEvent()
    {
    }

    public static AuditOutboxEvent Create(
        string eventId,
        string eventType,
        string? aggregateType,
        string? aggregateId,
        string payloadJson)
    {
        var now = DateTime.UtcNow;
        return new AuditOutboxEvent
        {
            Id = Guid.NewGuid().ToString(),
            EventId = eventId,
            EventType = eventType,
            AggregateType = aggregateType,
            AggregateId = aggregateId,
            PayloadJson = payloadJson,
            Status = "PENDING",
            CreatedAtUtc = now,
            AvailableAtUtc = now
        };
    }
}
