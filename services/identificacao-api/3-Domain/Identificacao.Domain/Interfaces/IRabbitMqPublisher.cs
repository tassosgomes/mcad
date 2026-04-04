using CloudNative.CloudEvents;

namespace Identificacao.Domain.Interfaces;

public interface IRabbitMqPublisher
{
    Task PublishAsync(string routingKey, CloudEvent cloudEvent, CancellationToken ct);
}
