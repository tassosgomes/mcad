using Cadastro.Domain.Entities;
using Cadastro.Infra.Data;
using Cadastro.Infra.Events;
using CloudNative.CloudEvents;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Cadastro.UnitTests.Events;

/// <summary>
/// Testes unitários para OutboxPublisherWorker.
/// Usa polling com WaitForConditionAsync para aguardar os ciclos do BackgroundService.
/// </summary>
public class OutboxPublisherWorkerTests : IAsyncDisposable
{
    private readonly CancellationTokenSource _cts = new(TimeSpan.FromSeconds(15));

    private static CadastroDbContext BuildInMemoryContext()
    {
        var options = new DbContextOptionsBuilder<CadastroDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new CadastroDbContext(options);
    }

    private static IConfiguration BuildConfig(int intervalSeconds = 1)
    {
        var configMock = new Mock<IConfiguration>();
        configMock.Setup(c => c["OUTBOX_POLL_INTERVAL_SECONDS"]).Returns(intervalSeconds.ToString());
        return configMock.Object;
    }

    private static IServiceScopeFactory BuildScopeFactory(CadastroDbContext context)
    {
        var services = new ServiceCollection();
        services.AddSingleton(context);
        var sp = services.BuildServiceProvider();

        var scopeMock = new Mock<IServiceScope>();
        scopeMock.Setup(s => s.ServiceProvider).Returns(sp);
        scopeMock.Setup(s => s.Dispose());

        var scopeFactoryMock = new Mock<IServiceScopeFactory>();
        scopeFactoryMock.Setup(f => f.CreateScope()).Returns(scopeMock.Object);
        return scopeFactoryMock.Object;
    }

    private static async Task<bool> WaitForConditionAsync(Func<bool> condition, TimeSpan timeout)
    {
        var deadline = DateTime.UtcNow + timeout;
        while (DateTime.UtcNow < deadline)
        {
            try { if (condition()) return true; } catch { }
            await Task.Delay(250);
        }
        try { return condition(); } catch { return false; }
    }

    public async ValueTask DisposeAsync()
    {
        await _cts.CancelAsync();
        _cts.Dispose();
    }

    [Fact]
    public async Task ExecuteAsync_ComUmPendente_DevePublicar()
    {
        using var context = BuildInMemoryContext();
        context.OutboxEvents.Add(OutboxEvent.Criar("cadastro.obra.liberada", Guid.NewGuid().ToString(), "{}"));
        await context.SaveChangesAsync();

        var publishCount = 0;
        var publisherMock = new Mock<IRabbitMqPublisher>();
        publisherMock
            .Setup(p => p.PublishAsync(It.IsAny<string>(), It.IsAny<CloudEvent>(), It.IsAny<CancellationToken>()))
            .Callback(() => Interlocked.Increment(ref publishCount))
            .Returns(Task.CompletedTask);

        var worker = new OutboxPublisherWorker(
            BuildScopeFactory(context), publisherMock.Object,
            NullLogger<OutboxPublisherWorker>.Instance, BuildConfig(1));

        await worker.StartAsync(_cts.Token);
        var success = await WaitForConditionAsync(() => publishCount >= 1, TimeSpan.FromSeconds(5));
        await _cts.CancelAsync();

        Assert.True(success, $"Esperado 1 publish — obtido: {publishCount}");
    }

    [Fact]
    public async Task ExecuteAsync_ComFalhaNaPublicacao_DeveIncrementarAttempts()
    {
        using var context = BuildInMemoryContext();
        var evento = OutboxEvent.Criar("cadastro.obra.liberada", Guid.NewGuid().ToString(), "{}");
        context.OutboxEvents.Add(evento);
        await context.SaveChangesAsync();

        var publisherMock = new Mock<IRabbitMqPublisher>();
        publisherMock
            .Setup(p => p.PublishAsync(It.IsAny<string>(), It.IsAny<CloudEvent>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("RabbitMQ indisponível"));

        var worker = new OutboxPublisherWorker(
            BuildScopeFactory(context), publisherMock.Object,
            NullLogger<OutboxPublisherWorker>.Instance, BuildConfig(1));

        await worker.StartAsync(_cts.Token);

        var success = await WaitForConditionAsync(() =>
        {
            context.ChangeTracker.Clear();
            var ev = context.OutboxEvents.Find(evento.Id);
            return ev?.Attempts > 0;
        }, TimeSpan.FromSeconds(5));

        await _cts.CancelAsync();

        Assert.True(success, "Attempts não foi incrementado após falha de publicação");
    }

    [Fact]
    public async Task ExecuteAsync_EventoExcedido_NaoDevePublicar()
    {
        using var context = BuildInMemoryContext();
        var evento = OutboxEvent.Criar("cadastro.obra.liberada", Guid.NewGuid().ToString(), "{}");
        for (int i = 0; i < 10; i++) evento.IncrementarTentativa();
        context.OutboxEvents.Add(evento);
        await context.SaveChangesAsync();

        var publisherMock = new Mock<IRabbitMqPublisher>();
        publisherMock
            .Setup(p => p.PublishAsync(It.IsAny<string>(), It.IsAny<CloudEvent>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var worker = new OutboxPublisherWorker(
            BuildScopeFactory(context), publisherMock.Object,
            NullLogger<OutboxPublisherWorker>.Instance, BuildConfig(1));

        await worker.StartAsync(_cts.Token);
        await Task.Delay(3000); // aguarda 2+ ciclos
        await _cts.CancelAsync();

        publisherMock.Verify(p => p.PublishAsync(
            It.IsAny<string>(), It.IsAny<CloudEvent>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }
}
