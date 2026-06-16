using System.Reflection;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using Identificacao.Domain.Entities;
using Identificacao.Domain.Interfaces;
using Identificacao.Infra.Events;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace Identificacao.Tests.Infra;

public class ArrecadacaoUsuarioMusicaEventConsumerTests
{
    private readonly Mock<IChannel> _channelMock;
    private readonly Mock<IUsuarioMusicaSnapshotRepository> _repoMock;
    private readonly Mock<IServiceScopeFactory> _scopeFactoryMock;
    private readonly Mock<ILogger<ArrecadacaoUsuarioMusicaEventConsumer>> _loggerMock;
    private readonly IConfiguration _configuration;

    public ArrecadacaoUsuarioMusicaEventConsumerTests()
    {
        _channelMock = new Mock<IChannel>();
        _repoMock = new Mock<IUsuarioMusicaSnapshotRepository>();

        var serviceProvider = new Mock<IServiceProvider>();
        serviceProvider
            .Setup(sp => sp.GetService(typeof(IUsuarioMusicaSnapshotRepository)))
            .Returns(_repoMock.Object);

        var scope = new Mock<IServiceScope>();
        scope.Setup(s => s.ServiceProvider).Returns(serviceProvider.Object);

        _scopeFactoryMock = new Mock<IServiceScopeFactory>();
        _scopeFactoryMock
            .Setup(f => f.CreateScope())
            .Returns(scope.Object);

        _loggerMock = new Mock<ILogger<ArrecadacaoUsuarioMusicaEventConsumer>>();

        var inMemorySettings = new Dictionary<string, string?>
        {
            { "RABBITMQ_URL", "amqp://localhost:5672" },
            { "ARRECADACAO_EXCHANGE", "arrecadacao.events" }
        };
        _configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();
    }

    [Fact]
    public async Task OnMessage_UpsertsNewSnapshot_OnCriadoEvent()
    {
        var id = Guid.NewGuid();
        var now = DateTime.UtcNow;
        var payload = new UsuarioMusicaEventEnvelope(
            "arrecadacao.usuario-musica.criado",
            new UsuarioMusicaEventData(id, "Radio Globo", "12345678000190", "ATIVO", now));

        _repoMock.Setup(r => r.GetByIdAsync(id, It.IsAny<CancellationToken>())).ReturnsAsync((UsuarioMusicaSnapshot?)null);

        var ea = CreateEventArgs(payload);

        await InvokeOnMessageAsync(ea);

        _repoMock.Verify(r => r.UpsertAsync(
            It.Is<UsuarioMusicaSnapshot>(s => s.Id == id && s.RazaoSocial == "Radio Globo"),
            It.IsAny<CancellationToken>()), Times.Once);

        _repoMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);

        _channelMock.Verify(
            c => c.BasicAckAsync(It.IsAny<ulong>(), false, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task OnMessage_UpdatesExistingSnapshot_OnAtualizadoEvent()
    {
        var id = Guid.NewGuid();
        var oldTime = DateTime.UtcNow.AddHours(-1);
        var newTime = DateTime.UtcNow;

        var existing = UsuarioMusicaSnapshot.Criar(id, "Old Name", "12345678000190", "ATIVO", oldTime);
        _repoMock.Setup(r => r.GetByIdAsync(id, It.IsAny<CancellationToken>())).ReturnsAsync(existing);

        var payload = new UsuarioMusicaEventEnvelope(
            "arrecadacao.usuario-musica.atualizado",
            new UsuarioMusicaEventData(id, "Radio Globo Atualizada", "12345678000190", "INATIVO", newTime));

        var ea = CreateEventArgs(payload);

        await InvokeOnMessageAsync(ea);

        _repoMock.Verify(r => r.UpsertAsync(
            It.Is<UsuarioMusicaSnapshot>(s => s.Id == id && s.Status == "INATIVO"),
            It.IsAny<CancellationToken>()), Times.Once);

        _repoMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);

        _channelMock.Verify(
            c => c.BasicAckAsync(It.IsAny<ulong>(), false, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task OnMessage_IgnoresStaleEvent_AtualizadoEmOlder()
    {
        var id = Guid.NewGuid();
        var newerTime = DateTime.UtcNow.AddHours(1);

        var existing = UsuarioMusicaSnapshot.Criar(id, "Current Name", "12345678000190", "ATIVO", newerTime);
        _repoMock.Setup(r => r.GetByIdAsync(id, It.IsAny<CancellationToken>())).ReturnsAsync(existing);

        var olderTime = DateTime.UtcNow.AddHours(-2);
        var payload = new UsuarioMusicaEventEnvelope(
            "arrecadacao.usuario-musica.atualizado",
            new UsuarioMusicaEventData(id, "Stale Name", "12345678000190", "INATIVO", olderTime));

        var ea = CreateEventArgs(payload);

        await InvokeOnMessageAsync(ea);

        _repoMock.Verify(r => r.UpsertAsync(It.IsAny<UsuarioMusicaSnapshot>(), It.IsAny<CancellationToken>()), Times.Never);
        _repoMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);

        _channelMock.Verify(
            c => c.BasicAckAsync(It.IsAny<ulong>(), false, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task OnMessage_IgnoresEqualAtualizadoEm()
    {
        var id = Guid.NewGuid();
        var sameTime = DateTime.UtcNow;

        var existing = UsuarioMusicaSnapshot.Criar(id, "Current Name", "12345678000190", "ATIVO", sameTime);
        _repoMock.Setup(r => r.GetByIdAsync(id, It.IsAny<CancellationToken>())).ReturnsAsync(existing);

        var payload = new UsuarioMusicaEventEnvelope(
            "arrecadacao.usuario-musica.atualizado",
            new UsuarioMusicaEventData(id, "Duplicate Event", "12345678000190", "INATIVO", sameTime));

        var ea = CreateEventArgs(payload);

        await InvokeOnMessageAsync(ea);

        _repoMock.Verify(r => r.UpsertAsync(It.IsAny<UsuarioMusicaSnapshot>(), It.IsAny<CancellationToken>()), Times.Never);
        _repoMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);

        _channelMock.Verify(
            c => c.BasicAckAsync(It.IsAny<ulong>(), false, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task OnMessage_AcksEmptyPayload()
    {
        var ea = CreateEventArgs(Array.Empty<byte>(), "arrecadacao.usuario-musica.criado");

        await InvokeOnMessageAsync(ea);

        _channelMock.Verify(
            c => c.BasicAckAsync(It.IsAny<ulong>(), false, It.IsAny<CancellationToken>()),
            Times.Once);

        _repoMock.Verify(r => r.UpsertAsync(It.IsAny<UsuarioMusicaSnapshot>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task OnMessage_AcksInvalidPayload_EmptyId()
    {
        var payload = new UsuarioMusicaEventEnvelope(
            "arrecadacao.usuario-musica.criado",
            new UsuarioMusicaEventData(Guid.Empty, "Radio Globo", "12345678000190", "ATIVO", DateTime.UtcNow));

        var ea = CreateEventArgs(payload);

        await InvokeOnMessageAsync(ea);

        _channelMock.Verify(
            c => c.BasicAckAsync(It.IsAny<ulong>(), false, It.IsAny<CancellationToken>()),
            Times.Once);

        _repoMock.Verify(r => r.UpsertAsync(It.IsAny<UsuarioMusicaSnapshot>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task OnMessage_NacksAndRequeues_OnException()
    {
        _repoMock
            .Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Simulated failure"));

        var id = Guid.NewGuid();
        var payload = new UsuarioMusicaEventEnvelope(
            "arrecadacao.usuario-musica.criado",
            new UsuarioMusicaEventData(id, "Radio Globo", "12345678000190", "ATIVO", DateTime.UtcNow));

        var ea = CreateEventArgs(payload);

        await InvokeOnMessageAsync(ea);

        _channelMock.Verify(
            c => c.BasicNackAsync(It.IsAny<ulong>(), false, true, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    private async Task InvokeOnMessageAsync(BasicDeliverEventArgs ea)
    {
        var consumer = new ArrecadacaoUsuarioMusicaEventConsumer(
            _scopeFactoryMock.Object,
            _configuration,
            _loggerMock.Object);

        var channelField = typeof(ArrecadacaoUsuarioMusicaEventConsumer)
            .GetField("_channel", BindingFlags.NonPublic | BindingFlags.Instance);

        channelField!.SetValue(consumer, _channelMock.Object);

        var method = typeof(ArrecadacaoUsuarioMusicaEventConsumer)
            .GetMethod("OnMessageAsync", BindingFlags.NonPublic | BindingFlags.Instance);

        var task = (Task)method!.Invoke(consumer, [null!, ea])!;
        await task;
    }

    private static BasicDeliverEventArgs CreateEventArgs(UsuarioMusicaEventEnvelope payload)
    {
        var json = JsonSerializer.Serialize(payload);
        var body = Encoding.UTF8.GetBytes(json);
        return CreateEventArgs(body, payload.Type ?? "arrecadacao.usuario-musica.criado");
    }

    private static BasicDeliverEventArgs CreateEventArgs(byte[] body, string routingKey)
    {
        var props = new Mock<IReadOnlyBasicProperties>();
        props.Setup(p => p.ContentType).Returns("application/json");
        props.Setup(p => p.Headers).Returns(new Dictionary<string, object?>());

        return new BasicDeliverEventArgs(
            consumerTag: "test-consumer",
            deliveryTag: 1,
            redelivered: false,
            exchange: "arrecadacao.events",
            routingKey: routingKey,
            properties: props.Object,
            body: body);
    }
}
