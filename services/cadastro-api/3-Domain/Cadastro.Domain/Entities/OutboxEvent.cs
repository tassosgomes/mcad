namespace Cadastro.Domain.Entities;

/// <summary>
/// Entidade de domínio que representa um evento pendente de publicação no RabbitMQ.
/// Implementa o Outbox Pattern: salva junto da entidade na mesma transação,
/// garantindo entrega at-least-once sem risco de perda por falha entre SaveChanges e publish.
/// </summary>
public class OutboxEvent
{
    public Guid Id { get; private set; }
    public string Type { get; private set; } = null!;         // ex: cadastro.obra.liberada
    public string RoutingKey { get; private set; } = null!;   // ex: cadastro.obra.liberada (= Type)
    public string Subject { get; private set; } = null!;      // entity ID (obraId, fonogramaId...)
    public string Payload { get; private set; } = null!;      // JSON do payload do evento
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
            RoutingKey = type, // routing key = event type (ex: cadastro.obra.liberada)
            Subject = subject,
            Payload = payload,
            CreatedAt = DateTime.UtcNow,
            PublishedAt = null,
            Attempts = 0,
        };
    }

    /// <summary>Marca o evento como publicado com sucesso.</summary>
    public void MarcarPublicado()
    {
        PublishedAt = DateTime.UtcNow;
    }

    /// <summary>Incrementa o contador de tentativas após falha de publicação.</summary>
    public void IncrementarTentativa()
    {
        Attempts++;
    }

    /// <summary>True se o evento atingiu o limite máximo de 10 tentativas.</summary>
    public bool ExcedeuTentativas => Attempts >= 10;
}
