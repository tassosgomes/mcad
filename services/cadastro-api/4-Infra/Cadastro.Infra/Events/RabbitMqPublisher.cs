using CloudNative.CloudEvents;
using CloudNative.CloudEvents.SystemTextJson;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using RabbitMQ.Client;

namespace Cadastro.Infra.Events;

/// <summary>
/// Implementação do publisher RabbitMQ usando CloudEvents 1.0 (structured mode JSON).
/// Registrado como Singleton para manter uma conexão persistente durante o lifetime da app.
/// A exchange 'cadastro.events' (topic, durable) é declarada no construtor,
/// garantindo que exista antes da primeira publicação (RF-15: auto-create no startup).
/// </summary>
public class RabbitMqPublisher : IRabbitMqPublisher, IDisposable, IAsyncDisposable
{
    private const string Exchange = "cadastro.events";

    private readonly IConnection? _connection;
    private readonly IChannel? _channel;
    private readonly ILogger<RabbitMqPublisher> _logger;
    private bool _disposed;

    public RabbitMqPublisher(IConfiguration configuration, ILogger<RabbitMqPublisher> logger)
    {
        _logger = logger;

        var rabbitUrl = configuration["RABBITMQ_URL"] ?? "amqp://guest:guest@localhost:5672";

        try
        {
            var factory = new ConnectionFactory
            {
                Uri = new Uri(rabbitUrl)
            };

            _connection = factory.CreateConnectionAsync().GetAwaiter().GetResult();
            _channel = _connection.CreateChannelAsync().GetAwaiter().GetResult();

            // Declara o exchange topic+durable (idempotente — sem falha se já existir)
            _channel.ExchangeDeclareAsync(
                exchange: Exchange,
                type: ExchangeType.Topic,
                durable: true,
                autoDelete: false
            ).GetAwaiter().GetResult();

            _logger.LogInformation("RabbitMqPublisher conectado ao broker. Exchange '{Exchange}' declarada.", Exchange);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "RabbitMqPublisher não conseguiu conectar ao RabbitMQ ({Url}). " +
                "O worker continuará tentando publicar eventos.", rabbitUrl);
            // Não relança — app inicia mesmo sem RabbitMQ disponível (RF-41)
        }
    }

    /// <inheritdoc />
    public async Task PublishAsync(string routingKey, CloudEvent cloudEvent, CancellationToken ct)
    {
        if (_channel is null)
            throw new InvalidOperationException("Canal RabbitMQ não está disponível.");

        var formatter = new JsonEventFormatter();
        var body = formatter.EncodeStructuredModeMessage(cloudEvent, out var contentType);

        var props = new BasicProperties
        {
            MessageId = cloudEvent.Id,
            ContentType = contentType.MediaType,
            DeliveryMode = DeliveryModes.Persistent, // sobrevive a restart do broker
        };

        await _channel.BasicPublishAsync(
            exchange: Exchange,
            routingKey: routingKey,
            mandatory: false,
            basicProperties: props,
            body: body,
            cancellationToken: ct
        );
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        _channel?.Dispose();
        _connection?.Dispose();
    }

    public async ValueTask DisposeAsync()
    {
        if (_disposed) return;
        _disposed = true;
        if (_channel is not null) await _channel.DisposeAsync();
        if (_connection is not null) await _connection.DisposeAsync();
    }
}
