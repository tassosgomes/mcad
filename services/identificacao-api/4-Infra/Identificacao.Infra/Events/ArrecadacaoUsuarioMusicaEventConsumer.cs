using System.Text;
using System.Text.Json;
using CloudNative.CloudEvents;
using CloudNative.CloudEvents.SystemTextJson;
using Identificacao.Domain.Entities;
using Identificacao.Domain.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace Identificacao.Infra.Events;

public class ArrecadacaoUsuarioMusicaEventConsumer : BackgroundService
{
    private const string DefaultExchange = "arrecadacao.events";
    private const string QueueName = "identificacao.usuario-musica.sync";
    private const string RoutingKeyCriado = "arrecadacao.usuario-musica.criado";
    private const string RoutingKeyAtualizado = "arrecadacao.usuario-musica.atualizado";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ArrecadacaoUsuarioMusicaEventConsumer> _logger;
    private readonly string _rabbitUrl;
    private readonly string? _rabbitVhost;
    private readonly string _exchange;
    private readonly TimeSpan _reconnectDelay;

    private IConnection? _connection;
    private IChannel? _channel;

    public ArrecadacaoUsuarioMusicaEventConsumer(
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        ILogger<ArrecadacaoUsuarioMusicaEventConsumer> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _rabbitUrl = configuration["RABBITMQ_URL"] ?? "amqp://guest:guest@localhost:5672";
        _rabbitVhost = configuration["RABBITMQ_VHOST"];
        _exchange = configuration["ARRECADACAO_EXCHANGE"] ?? DefaultExchange;
        var reconnectSeconds = int.TryParse(configuration["RABBITMQ_RECONNECT_SECONDS"], out var s) ? s : 10;
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
            catch (Exception ex)
            {
                _logger.LogWarning(ex,
                    "ArrecadacaoUsuarioMusicaEventConsumer falhou na conexão/consumo. Tentando novamente em {Delay}s.",
                    _reconnectDelay.TotalSeconds);
                await CloseChannelAsync();
                try { await Task.Delay(_reconnectDelay, stoppingToken); }
                catch (OperationCanceledException) { break; }
            }
        }

        await CloseChannelAsync();
        _logger.LogInformation("ArrecadacaoUsuarioMusicaEventConsumer encerrado.");
    }

    private async Task EnsureConnectedAsync(CancellationToken ct)
    {
        var factory = new ConnectionFactory { Uri = new Uri(_rabbitUrl) };
        if (!string.IsNullOrWhiteSpace(_rabbitVhost)) factory.VirtualHost = _rabbitVhost;

        _connection = await factory.CreateConnectionAsync(ct);
        _channel = await _connection.CreateChannelAsync(cancellationToken: ct);

        await _channel.ExchangeDeclareAsync(
            exchange: _exchange,
            type: ExchangeType.Topic,
            durable: true,
            autoDelete: false,
            cancellationToken: ct);

        await _channel.QueueDeclareAsync(
            queue: QueueName,
            durable: true,
            exclusive: false,
            autoDelete: false,
            cancellationToken: ct);

        await _channel.QueueBindAsync(
            queue: QueueName,
            exchange: _exchange,
            routingKey: RoutingKeyCriado,
            cancellationToken: ct);

        await _channel.QueueBindAsync(
            queue: QueueName,
            exchange: _exchange,
            routingKey: RoutingKeyAtualizado,
            cancellationToken: ct);

        var consumer = new AsyncEventingBasicConsumer(_channel);
        consumer.ReceivedAsync += OnMessageAsync;

        await _channel.BasicConsumeAsync(
            queue: QueueName,
            autoAck: false,
            consumer: consumer,
            cancellationToken: ct);

        _logger.LogInformation(
            "ArrecadacaoUsuarioMusicaEventConsumer escutando fila '{Queue}' (exchange '{Exchange}', routing keys '{Key1}', '{Key2}').",
            QueueName, _exchange, RoutingKeyCriado, RoutingKeyAtualizado);
    }

    private async Task OnMessageAsync(object sender, BasicDeliverEventArgs ea)
    {
        if (_channel is null) return;

        try
        {
            var data = ExtractEventData(ea);
            if (data is null || data.Id == Guid.Empty)
            {
                _logger.LogWarning(
                    "Evento {RoutingKey} ignorado: payload inválido ou Id ausente.", ea.RoutingKey);
                await _channel.BasicAckAsync(ea.DeliveryTag, multiple: false);
                return;
            }

            using var scope = _scopeFactory.CreateScope();
            var repo = scope.ServiceProvider.GetRequiredService<IUsuarioMusicaSnapshotRepository>();

            var existing = await repo.GetByIdAsync(data.Id, CancellationToken.None);
            if (existing is not null && data.AtualizadoEm <= existing.AtualizadoEm)
            {
                _logger.LogInformation(
                    "Evento {RoutingKey} para {Id} ignorado: stale (incoming {Incoming} <= stored {Stored}).",
                    ea.RoutingKey, data.Id, data.AtualizadoEm, existing.AtualizadoEm);
                await _channel.BasicAckAsync(ea.DeliveryTag, multiple: false);
                return;
            }

            var snapshot = UsuarioMusicaSnapshot.Criar(
                data.Id, data.RazaoSocial, data.Cnpj, data.Status, data.AtualizadoEm);

            await repo.UpsertAsync(snapshot, CancellationToken.None);
            await repo.SaveChangesAsync(CancellationToken.None);

            _logger.LogInformation(
                "Usuário de Música {Id} sincronizado. status={Status} razaoSocial={RazaoSocial}.",
                data.Id, data.Status, data.RazaoSocial);

            await _channel.BasicAckAsync(ea.DeliveryTag, multiple: false);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Erro ao processar evento {RoutingKey}. Será reentregue.", ea.RoutingKey);
            try { await _channel.BasicNackAsync(ea.DeliveryTag, multiple: false, requeue: true); }
            catch (Exception nackEx) { _logger.LogWarning(nackEx, "Falha ao nack do evento."); }
        }
    }

    private static UsuarioMusicaEventData? ExtractEventData(BasicDeliverEventArgs ea)
    {
        if (ea.Body.Length == 0) return null;

        var contentType = ea.BasicProperties.ContentType;
        if (!string.IsNullOrEmpty(contentType)
            && contentType.Contains("cloudevents", StringComparison.OrdinalIgnoreCase))
        {
            var formatter = new JsonEventFormatter();
            var cloudEvent = formatter.DecodeStructuredModeMessage(
                ea.Body.ToArray(), new System.Net.Mime.ContentType(contentType), extensionAttributes: null);
            return DeserializeData(cloudEvent.Data);
        }

        var json = Encoding.UTF8.GetString(ea.Body.ToArray());
        var envelope = JsonSerializer.Deserialize<UsuarioMusicaEventEnvelope>(json, JsonOptions);
        return envelope?.Data;
    }

    private static UsuarioMusicaEventData? DeserializeData(object? data)
    {
        if (data is null) return null;

        return data switch
        {
            UsuarioMusicaEventData typed => typed,
            string raw => JsonSerializer.Deserialize<UsuarioMusicaEventData>(raw, JsonOptions),
            byte[] bytes => JsonSerializer.Deserialize<UsuarioMusicaEventData>(bytes, JsonOptions),
            JsonElement el => el.Deserialize<UsuarioMusicaEventData>(JsonOptions),
            _ => JsonSerializer.Deserialize<UsuarioMusicaEventData>(
                JsonSerializer.Serialize(data, JsonOptions), JsonOptions)
        };
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
            _logger.LogDebug(ex, "Falha ao fechar conexão RabbitMQ.");
        }
    }
}

public record UsuarioMusicaEventEnvelope(string? Type, UsuarioMusicaEventData? Data);

public record UsuarioMusicaEventData(Guid Id, string RazaoSocial, string Cnpj, string Status, DateTime AtualizadoEm);
