namespace Identificacao.Domain.Entities;

/// <summary>
/// Entidade de domínio que representa um evento pendente de publicação no RabbitMQ.
/// Implementa o Outbox Pattern: salva junto da entidade na mesma transação,
/// garantindo entrega at-least-once sem risco de perda por falha entre SaveChanges e publish.
/// </summary>
public class OutboxEvent
{
    public Guid Id { get; private set; }
    public string Type { get; private set; } = null!;
    public string RoutingKey { get; private set; } = null!;
    public string Subject { get; private set; } = null!;
    public string Payload { get; private set; } = null!;
    public DateTime CreatedAt { get; private set; }
    public DateTime? PublishedAt { get; private set; }
    public int Attempts { get; private set; }

    private OutboxEvent() { }

    public static OutboxEvent Criar(string type, string subject, string payload)
    {
        return new OutboxEvent
        {
            Id = Guid.NewGuid(),
            Type = type,
            RoutingKey = type,
            Subject = subject,
            Payload = payload,
            CreatedAt = DateTime.UtcNow,
            PublishedAt = null,
            Attempts = 0,
        };
    }

    public void MarcarPublicado()
    {
        PublishedAt = DateTime.UtcNow;
    }

    public void IncrementarTentativa()
    {
        Attempts++;
    }

    public bool ExcedeuTentativas => Attempts >= 10;
}
