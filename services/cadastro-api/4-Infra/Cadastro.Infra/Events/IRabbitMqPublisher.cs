using CloudNative.CloudEvents;

namespace Cadastro.Infra.Events;

/// <summary>
/// Contrato para publicação de eventos no RabbitMQ em formato CloudEvents.
/// Permite mock nos testes de integração sem conexão real com o broker.
/// </summary>
public interface IRabbitMqPublisher
{
    /// <summary>
    /// Publica um CloudEvent no exchange 'cadastro.events' com a routing key especificada.
    /// </summary>
    Task PublishAsync(string routingKey, CloudEvent cloudEvent, CancellationToken ct);
}
