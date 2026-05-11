using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Identificacao.Infra.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Npgsql;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using RabbitMQ.Client.Exceptions;

namespace Identificacao.Infra.Events;

public sealed class IdentityUserEventConsumer : BackgroundService
{
    private const string DefaultExchange = "identity.events";
    private const string DefaultQueue = "identificacao.identity.users";
    private const string RoutingKey = "identity.user.*";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<IdentityUserEventConsumer> _logger;
    private readonly string _rabbitUrl;
    private readonly string? _rabbitVhost;
    private readonly string _exchange;
    private readonly string _queue;
    private readonly TimeSpan _reconnectDelay;

    private IConnection? _connection;
    private IChannel? _channel;

    public IdentityUserEventConsumer(
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        ILogger<IdentityUserEventConsumer> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _rabbitUrl = configuration["RABBITMQ_URL"] ?? "amqp://guest:guest@localhost:5672";
        _rabbitVhost = configuration["RABBITMQ_VHOST"];
        _exchange = configuration["IDENTITY_EVENTS_EXCHANGE"] ?? DefaultExchange;
        _queue = configuration["IDENTITY_EVENTS_QUEUE"] ?? DefaultQueue;
        var reconnectSeconds = int.TryParse(configuration["RABBITMQ_RECONNECT_SECONDS"], out var seconds) ? seconds : 10;
        _reconnectDelay = TimeSpan.FromSeconds(reconnectSeconds);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await EnsureConnectedAsync(stoppingToken);
                await Task.Delay(Timeout.Infinite, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex) when (ex is BrokerUnreachableException or RabbitMQClientException or IOException or TimeoutException)
            {
                _logger.LogWarning(ex,
                    "IdentityUserEventConsumer falhou na conexão/consumo. Tentando novamente em {Delay}s.",
                    _reconnectDelay.TotalSeconds);
                await CloseChannelAsync();
                try { await Task.Delay(_reconnectDelay, stoppingToken); }
                catch (OperationCanceledException) { break; }
            }
        }

        await CloseChannelAsync();
        _logger.LogInformation("IdentityUserEventConsumer encerrado.");
    }

    private async Task EnsureConnectedAsync(CancellationToken ct)
    {
        var factory = new ConnectionFactory { Uri = new Uri(_rabbitUrl) };
        if (!string.IsNullOrWhiteSpace(_rabbitVhost)) factory.VirtualHost = _rabbitVhost;

        _connection = await factory.CreateConnectionAsync(ct);
        _channel = await _connection.CreateChannelAsync(cancellationToken: ct);

        await _channel.ExchangeDeclareAsync(_exchange, ExchangeType.Topic, durable: true, autoDelete: false, cancellationToken: ct);
        await _channel.QueueDeclareAsync(_queue, durable: true, exclusive: false, autoDelete: false, cancellationToken: ct);
        await _channel.QueueBindAsync(_queue, _exchange, RoutingKey, cancellationToken: ct);

        var consumer = new AsyncEventingBasicConsumer(_channel);
        consumer.ReceivedAsync += OnMessageAsync;

        await _channel.BasicConsumeAsync(_queue, autoAck: false, consumer, cancellationToken: ct);

        _logger.LogInformation(
            "IdentityUserEventConsumer escutando fila '{Queue}' (exchange '{Exchange}', routing key '{RoutingKey}').",
            _queue, _exchange, RoutingKey);
    }

    private async Task OnMessageAsync(object sender, BasicDeliverEventArgs ea)
    {
        if (_channel is null) return;

        try
        {
            var identityEvent = DeserializeEvent(ea.Body.ToArray());
            if (identityEvent is null || !identityEvent.IsSupported)
            {
                _logger.LogWarning("Evento de identidade ignorado. routingKey={RoutingKey}", ea.RoutingKey);
                await _channel.BasicAckAsync(ea.DeliveryTag, multiple: false);
                return;
            }

            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<IdentificacaoDbContext>();
            await UpsertAsync(context, identityEvent, CancellationToken.None);

            _logger.LogInformation(
                "Usuário de identidade sincronizado. logtoUserId={LogtoUserId} eventType={EventType}",
                identityEvent.User.LogtoUserId,
                identityEvent.EventType);

            await _channel.BasicAckAsync(ea.DeliveryTag, multiple: false);
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Evento de identidade descartado: JSON inválido.");
            await _channel.BasicAckAsync(ea.DeliveryTag, multiple: false);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao processar evento de identidade. Será reentregue.");
            try { await _channel.BasicNackAsync(ea.DeliveryTag, multiple: false, requeue: true); }
            catch (Exception nackEx) { _logger.LogWarning(nackEx, "Falha ao nack do evento de identidade."); }
        }
    }

    private static IdentityUserEvent? DeserializeEvent(byte[] body)
    {
        if (body.Length == 0) return null;
        return JsonSerializer.Deserialize<IdentityUserEvent>(Encoding.UTF8.GetString(body), JsonOptions);
    }

    private static Task UpsertAsync(IdentificacaoDbContext context, IdentityUserEvent identityEvent, CancellationToken ct)
    {
        const string sql = """
            INSERT INTO identificacao.usuarios_identidade (
                logto_user_id,
                username,
                display_name,
                email,
                avatar_url,
                roles,
                is_suspended,
                deleted_at_utc,
                raw_payload,
                last_event_id,
                last_event_type,
                last_event_occurred_at_utc,
                updated_at_utc
            )
            VALUES (
                @logto_user_id,
                @username,
                @display_name,
                @email,
                @avatar_url,
                CAST(@roles AS jsonb),
                @is_suspended,
                @deleted_at_utc,
                CAST(@raw_payload AS jsonb),
                @last_event_id,
                @last_event_type,
                @last_event_occurred_at_utc,
                NOW()
            )
            ON CONFLICT (logto_user_id) DO UPDATE SET
                username = EXCLUDED.username,
                display_name = EXCLUDED.display_name,
                email = EXCLUDED.email,
                avatar_url = EXCLUDED.avatar_url,
                roles = EXCLUDED.roles,
                is_suspended = EXCLUDED.is_suspended,
                deleted_at_utc = EXCLUDED.deleted_at_utc,
                raw_payload = EXCLUDED.raw_payload,
                last_event_id = EXCLUDED.last_event_id,
                last_event_type = EXCLUDED.last_event_type,
                last_event_occurred_at_utc = EXCLUDED.last_event_occurred_at_utc,
                updated_at_utc = NOW();
            """;

        var deletedAt = identityEvent.EventType == "identity.user.deleted"
            ? identityEvent.OccurredAt
            : (DateTimeOffset?)null;

        return context.Database.ExecuteSqlRawAsync(sql, [
            new NpgsqlParameter("logto_user_id", identityEvent.User.LogtoUserId),
            new NpgsqlParameter("username", (object?)identityEvent.User.Username ?? DBNull.Value),
            new NpgsqlParameter("display_name", (object?)identityEvent.User.DisplayName ?? DBNull.Value),
            new NpgsqlParameter("email", (object?)identityEvent.User.Email ?? DBNull.Value),
            new NpgsqlParameter("avatar_url", (object?)identityEvent.User.AvatarUrl ?? DBNull.Value),
            new NpgsqlParameter("roles", JsonSerializer.Serialize(identityEvent.User.Roles ?? [], JsonOptions)),
            new NpgsqlParameter("is_suspended", identityEvent.User.IsSuspended),
            new NpgsqlParameter("deleted_at_utc", (object?)deletedAt ?? DBNull.Value),
            new NpgsqlParameter("raw_payload", identityEvent.User.RawPayloadJson),
            new NpgsqlParameter("last_event_id", identityEvent.EventId),
            new NpgsqlParameter("last_event_type", identityEvent.EventType),
            new NpgsqlParameter("last_event_occurred_at_utc", identityEvent.OccurredAt),
        ], ct);
    }

    private async Task CloseChannelAsync()
    {
        try
        {
            if (_channel is not null)
            {
                await _channel.CloseAsync();
                await _channel.DisposeAsync();
                _channel = null;
            }

            if (_connection is not null)
            {
                await _connection.CloseAsync();
                await _connection.DisposeAsync();
                _connection = null;
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Falha ao fechar conexão RabbitMQ do consumidor de identidade.");
        }
    }

    private sealed record IdentityUserEvent(
        string EventId,
        string EventType,
        DateTimeOffset OccurredAt,
        IdentityUser User)
    {
        public bool IsSupported =>
            !string.IsNullOrWhiteSpace(EventId)
            && EventType is "identity.user.upserted" or "identity.user.suspended" or "identity.user.deleted"
            && User is not null
            && !string.IsNullOrWhiteSpace(User.LogtoUserId);
    }

    private sealed record IdentityUser(
        string LogtoUserId,
        string? Username,
        string? DisplayName,
        string? Email,
        string? AvatarUrl,
        string[]? Roles,
        bool IsSuspended,
        [property: JsonPropertyName("raw")] JsonElement Raw)
    {
        public string RawPayloadJson =>
            Raw.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null ? "{}" : Raw.GetRawText();
    }
}
