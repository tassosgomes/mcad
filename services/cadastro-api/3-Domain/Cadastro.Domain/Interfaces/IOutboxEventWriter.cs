namespace Cadastro.Domain.Interfaces;

/// <summary>
/// Contrato de domínio para escrita de eventos na outbox.
/// O Domain não conhece RabbitMQ nem CloudEvents — apenas declara
/// que precisa publicar um evento com tipo, subject (entity ID) e data (payload).
/// A implementação no Infra cuida do formato e persistência.
/// </summary>
public interface IOutboxEventWriter
{
    /// <summary>
    /// Registra um evento na outbox para publicação assíncrona.
    /// O evento será persistido na mesma transação via DbContext (SaveChanges do handler).
    /// </summary>
    /// <param name="eventType">Tipo do evento (ex: "cadastro.obra.liberada")</param>
    /// <param name="subject">ID da entidade afetada (ex: obraId.ToString())</param>
    /// <param name="data">Payload do evento — será serializado como JSON</param>
    void AddEvent(string eventType, string subject, object data);
}
