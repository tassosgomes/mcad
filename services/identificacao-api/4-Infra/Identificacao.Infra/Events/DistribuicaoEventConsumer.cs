using System.Text;
using System.Text.Json;
using CloudNative.CloudEvents;
using CloudNative.CloudEvents.SystemTextJson;
using Identificacao.Domain.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace Identificacao.Infra.Events;

public class DistribuicaoEventConsumer : BackgroundService
{
    private const string DefaultExchange = "distribuicao.events";
    private const string RoutingKey = "distribuicao.rol.processado";
    private const string QueueName = "identificacao.distribuicao.rol.processado";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<DistribuicaoEventConsumer> _logger;
    private readonly string _rabbitUrl;
    private readonly string? _rabbitVhost;
    private readonly string _exchange;
    private readonly TimeSpan _reconnectDelay;

    private IConnection? _connection;
    private IChannel? _channel;

    public DistribuicaoEventConsumer(
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        ILogger<DistribuicaoEventConsumer> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _rabbitUrl = configuration["RABBITMQ_URL"] ?? "amqp://guest:guest@localhost:5672";
        _rabbitVhost = configuration["RABBITMQ_VHOST"];
        _exchange = configuration["DISTRIBUICAO_EXCHANGE"] ?? DefaultExchange;
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
                    "DistribuicaoEventConsumer falhou na conexão/consumo. Tentando novamente em {Delay}s.",
                    _reconnectDelay.TotalSeconds);
                await CloseChannelAsync();
                try { await Task.Delay(_reconnectDelay, stoppingToken); }
                catch (OperationCanceledException) { break; }
            }
        }

        await CloseChannelAsync();
        _logger.LogInformation("DistribuicaoEventConsumer encerrado.");
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
            routingKey: RoutingKey,
            cancellationToken: ct);

        var consumer = new AsyncEventingBasicConsumer(_channel);
        consumer.ReceivedAsync += OnMessageAsync;

        await _channel.BasicConsumeAsync(
            queue: QueueName,
            autoAck: false,
            consumer: consumer,
            cancellationToken: ct);

        _logger.LogInformation(
            "DistribuicaoEventConsumer escutando fila '{Queue}' (exchange '{Exchange}', routing key '{Key}').",
            QueueName, _exchange, RoutingKey);
    }

    private async Task OnMessageAsync(object sender, BasicDeliverEventArgs ea)
    {
        if (_channel is null) return;

        try
        {
            var data = ExtractEventData(ea);
            if (data is null || data.CaptacaoId == Guid.Empty)
            {
                _logger.LogWarning(
                    "Evento {RoutingKey} ignorado: payload inválido ou captacaoId ausente.", ea.RoutingKey);
                await _channel.BasicAckAsync(ea.DeliveryTag, multiple: false);
                return;
            }

            using var scope = _scopeFactory.CreateScope();
            var captacaoRepo = scope.ServiceProvider.GetRequiredService<ICaptacaoRepository>();
            var captacao = await captacaoRepo.GetByIdAsync(data.CaptacaoId, CancellationToken.None);

            if (captacao is null)
            {
                _logger.LogWarning(
                    "Evento {RoutingKey} para captação {CaptacaoId} ignorado: captação não encontrada.",
                    ea.RoutingKey, data.CaptacaoId);
                await _channel.BasicAckAsync(ea.DeliveryTag, multiple: false);
                return;
            }

            if (captacao.DistribuicaoProcessada)
            {
                _logger.LogInformation(
                    "Captação {CaptacaoId} já estava marcada como processada. Evento idempotente.",
                    captacao.Id);
                await _channel.BasicAckAsync(ea.DeliveryTag, multiple: false);
                return;
            }

            captacao.MarcarDistribuicaoProcessada(data.ProcessadoEm);
            await captacaoRepo.SaveChangesAsync(CancellationToken.None);

            _logger.LogInformation(
                "Captação {CaptacaoId} marcada como processada pela Distribuição em {ProcessadoEm}.",
                captacao.Id, data.ProcessadoEm);

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

    private static DistribuicaoRolProcessadoData? ExtractEventData(BasicDeliverEventArgs ea)
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
        var envelope = JsonSerializer.Deserialize<DistribuicaoRolProcessadoEnvelope>(json, JsonOptions);
        return envelope?.Data;
    }

    private static DistribuicaoRolProcessadoData? DeserializeData(object? data)
    {
        if (data is null) return null;

        return data switch
        {
            DistribuicaoRolProcessadoData typed => typed,
            string raw => JsonSerializer.Deserialize<DistribuicaoRolProcessadoData>(raw, JsonOptions),
            byte[] bytes => JsonSerializer.Deserialize<DistribuicaoRolProcessadoData>(bytes, JsonOptions),
            JsonElement el => el.Deserialize<DistribuicaoRolProcessadoData>(JsonOptions),
            _ => JsonSerializer.Deserialize<DistribuicaoRolProcessadoData>(
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

public record DistribuicaoRolProcessadoEnvelope(string? Type, DistribuicaoRolProcessadoData? Data);

public record DistribuicaoRolProcessadoData(Guid CaptacaoId, DateTime ProcessadoEm);
