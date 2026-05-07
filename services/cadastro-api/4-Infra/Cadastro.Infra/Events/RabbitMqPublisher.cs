using CloudNative.CloudEvents;
using CloudNative.CloudEvents.SystemTextJson;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using RabbitMQ.Client;
using System.Text;

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

        var rabbitUrl = ResolveRabbitMqUrl(configuration);
        var rabbitVhost = configuration["RABBITMQ_VHOST"];

        try
        {
            var factory = new ConnectionFactory
            {
                Uri = new Uri(rabbitUrl)
            };

            if (!string.IsNullOrWhiteSpace(rabbitVhost))
            {
                factory.VirtualHost = rabbitVhost;
            }

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

    internal static string ResolveRabbitMqUrl(IConfiguration configuration)
    {
        var rabbitUrl = configuration["RABBITMQ_URL"];
        if (!string.IsNullOrWhiteSpace(rabbitUrl))
        {
            return rabbitUrl;
        }

        var host = configuration["RABBITMQ_HOST"];
        if (string.IsNullOrWhiteSpace(host))
        {
            return "amqp://guest:guest@localhost:5672";
        }

        var port = configuration["RABBITMQ_PORT"];
        var user = configuration["RABBITMQ_USER"];
        var password = configuration["RABBITMQ_PASSWORD"];
        var vhost = configuration["RABBITMQ_VHOST"];
        var scheme = string.Equals(port, "5671", StringComparison.Ordinal) ? "amqps" : "amqp";

        var builder = new StringBuilder();
        builder.Append(scheme).Append("://");

        if (!string.IsNullOrWhiteSpace(user))
        {
            builder.Append(Uri.EscapeDataString(user));

            if (!string.IsNullOrWhiteSpace(password))
            {
                builder.Append(':').Append(Uri.EscapeDataString(password));
            }

            builder.Append('@');
        }

        builder.Append(host);

        if (!string.IsNullOrWhiteSpace(port))
        {
            builder.Append(':').Append(port);
        }

        if (!string.IsNullOrWhiteSpace(vhost))
        {
            builder.Append('/').Append(Uri.EscapeDataString(vhost));
        }

        return builder.ToString();
    }
}
