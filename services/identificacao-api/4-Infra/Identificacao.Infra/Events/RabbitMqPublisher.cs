using CloudNative.CloudEvents;
using CloudNative.CloudEvents.SystemTextJson;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using RabbitMQ.Client;
using Identificacao.Domain.Interfaces;

namespace Identificacao.Infra.Events;

public class RabbitMqPublisher : IRabbitMqPublisher, IDisposable, IAsyncDisposable
{
    private const string Exchange = "identificacao.events";

    private readonly IConnection? _connection;
    private readonly IChannel? _channel;
    private readonly ILogger<RabbitMqPublisher> _logger;
    private bool _disposed;

    public RabbitMqPublisher(IConfiguration configuration, ILogger<RabbitMqPublisher> logger)
    {
        _logger = logger;

        var rabbitUrl = configuration["RABBITMQ_URL"] ?? "amqp://guest:guest@localhost:5672";
        var rabbitVhost = configuration["RABBITMQ_VHOST"];

        try
        {
            var factory = new ConnectionFactory { Uri = new Uri(rabbitUrl) };
            if (!string.IsNullOrWhiteSpace(rabbitVhost)) factory.VirtualHost = rabbitVhost;

            _connection = factory.CreateConnectionAsync().GetAwaiter().GetResult();
            _channel = _connection.CreateChannelAsync().GetAwaiter().GetResult();

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
                "RabbitMqPublisher não conseguiu conectar ao RabbitMQ ({Url}). ", rabbitUrl);
        }
    }

    public async Task PublishAsync(string routingKey, CloudEvent cloudEvent, CancellationToken ct)
    {
        if (_channel is null) throw new InvalidOperationException("Canal RabbitMQ não está disponível.");

        var formatter = new JsonEventFormatter();
        var body = formatter.EncodeStructuredModeMessage(cloudEvent, out var contentType);

        var props = new BasicProperties
        {
            MessageId = cloudEvent.Id,
            ContentType = contentType.MediaType,
            DeliveryMode = DeliveryModes.Persistent,
        };

        await _channel.BasicPublishAsync(Exchange, routingKey, false, props, body, ct);
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
