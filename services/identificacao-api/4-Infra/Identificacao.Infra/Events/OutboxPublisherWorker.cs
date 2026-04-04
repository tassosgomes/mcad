using Identificacao.Infra.Data;
using Identificacao.Domain.Interfaces;
using CloudNative.CloudEvents;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Identificacao.Infra.Events;

public class OutboxPublisherWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IRabbitMqPublisher _publisher;
    private readonly ILogger<OutboxPublisherWorker> _logger;
    private readonly TimeSpan _interval;

    public OutboxPublisherWorker(
        IServiceScopeFactory scopeFactory,
        IRabbitMqPublisher publisher,
        ILogger<OutboxPublisherWorker> logger,
        IConfiguration configuration)
    {
        _scopeFactory = scopeFactory;
        _publisher = publisher;
        _logger = logger;
        var intervalSeconds = int.TryParse(
            configuration["OUTBOX_POLL_INTERVAL_SECONDS"], out var secs) ? secs : 5;
        _interval = TimeSpan.FromSeconds(intervalSeconds);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("OutboxPublisherWorker iniciado. Intervalo: {Interval}s", _interval.TotalSeconds);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessPendingEventsAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro no OutboxPublisherWorker durante ciclo de publicação.");
            }

            await Task.Delay(_interval, stoppingToken);
        }

        _logger.LogInformation("OutboxPublisherWorker encerrado.");
    }

    private async Task ProcessPendingEventsAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<IdentificacaoDbContext>();

        var pendentes = await context.OutboxEvents
            .Where(e => e.PublishedAt == null && e.Attempts < 10)
            .OrderBy(e => e.CreatedAt)
            .Take(100)
            .ToListAsync(ct);

        if (pendentes.Count == 0) return;

        _logger.LogDebug("OutboxPublisherWorker: {Count} evento(s) pendente(s) encontrado(s).", pendentes.Count);

        foreach (var evento in pendentes)
        {
            try
            {
                var cloudEvent = BuildCloudEvent(evento);
                await _publisher.PublishAsync(evento.RoutingKey, cloudEvent, ct);
                evento.MarcarPublicado();
                _logger.LogInformation(
                    "Evento publicado. Type={EventType} Id={EventId} Subject={Subject}",
                    evento.Type, evento.Id, evento.Subject);
            }
            catch (Exception ex)
            {
                evento.IncrementarTentativa();
                _logger.LogWarning(ex,
                    "Falha ao publicar evento. Id={EventId} Type={EventType} Tentativa={Attempts}",
                    evento.Id, evento.Type, evento.Attempts);
            }
        }

        await context.SaveChangesAsync(ct);
    }

    private static CloudEvent BuildCloudEvent(Domain.Entities.OutboxEvent evento)
    {
        return new CloudEvent
        {
            Id = evento.Id.ToString(),
            Source = new Uri("urn:identificacao-api"),
            Type = evento.Type,
            Subject = evento.Subject,
            Time = new DateTimeOffset(evento.CreatedAt, TimeSpan.Zero),
            DataContentType = "application/json",
            Data = evento.Payload,
        };
    }
}
