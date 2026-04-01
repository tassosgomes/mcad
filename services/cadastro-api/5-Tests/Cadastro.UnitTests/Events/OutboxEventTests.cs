using Cadastro.Domain.Entities;

namespace Cadastro.UnitTests.Events;

/// <summary>
/// Testes unitários para a entidade OutboxEvent:
/// Criar, MarcarPublicado, IncrementarTentativa, ExcedeuTentativas.
/// </summary>
public class OutboxEventTests
{
    // ── Criar ─────────────────────────────────────────────────────────────────

    [Fact]
    public void Criar_DeveRetornar_CamposCorretos()
    {
        var type = "cadastro.obra.liberada";
        var subject = Guid.NewGuid().ToString();
        var payload = "{\"obraId\":\"abc\"}";

        var evento = OutboxEvent.Criar(type, subject, payload);

        Assert.Equal(type, evento.Type);
        Assert.Equal(type, evento.RoutingKey); // RoutingKey = Type
        Assert.Equal(subject, evento.Subject);
        Assert.Equal(payload, evento.Payload);
        Assert.NotEqual(Guid.Empty, evento.Id);
    }

    [Fact]
    public void Criar_DeveRetornar_PublishedAtNulo()
    {
        var evento = OutboxEvent.Criar("type", "subject", "{}");
        Assert.Null(evento.PublishedAt);
    }

    [Fact]
    public void Criar_DeveRetornar_AttemptsZero()
    {
        var evento = OutboxEvent.Criar("type", "subject", "{}");
        Assert.Equal(0, evento.Attempts);
    }

    [Fact]
    public void Criar_CreatedAt_DeveSerUtcRecente()
    {
        var antes = DateTime.UtcNow.AddSeconds(-1);
        var evento = OutboxEvent.Criar("type", "subject", "{}");
        var depois = DateTime.UtcNow.AddSeconds(1);

        Assert.True(evento.CreatedAt >= antes && evento.CreatedAt <= depois);
    }

    // ── MarcarPublicado ───────────────────────────────────────────────────────

    [Fact]
    public void MarcarPublicado_DevePreencherPublishedAt()
    {
        var evento = OutboxEvent.Criar("type", "subject", "{}");
        evento.MarcarPublicado();
        Assert.NotNull(evento.PublishedAt);
    }

    [Fact]
    public void MarcarPublicado_PublishedAt_DeveSerUtcRecente()
    {
        var antes = DateTime.UtcNow.AddSeconds(-1);
        var evento = OutboxEvent.Criar("type", "subject", "{}");
        evento.MarcarPublicado();
        var depois = DateTime.UtcNow.AddSeconds(1);

        Assert.True(evento.PublishedAt >= antes && evento.PublishedAt <= depois);
    }

    // ── IncrementarTentativa ──────────────────────────────────────────────────

    [Fact]
    public void IncrementarTentativa_DeveAumentarAttempts()
    {
        var evento = OutboxEvent.Criar("type", "subject", "{}");
        evento.IncrementarTentativa();
        Assert.Equal(1, evento.Attempts);
    }

    [Fact]
    public void IncrementarTentativa_MultiplasChamadas_DeveAcumular()
    {
        var evento = OutboxEvent.Criar("type", "subject", "{}");
        for (int i = 0; i < 5; i++) evento.IncrementarTentativa();
        Assert.Equal(5, evento.Attempts);
    }

    // ── ExcedeuTentativas ─────────────────────────────────────────────────────

    [Fact]
    public void ExcedeuTentativas_Com9Tentativas_DeveSeFalse()
    {
        var evento = OutboxEvent.Criar("type", "subject", "{}");
        for (int i = 0; i < 9; i++) evento.IncrementarTentativa();
        Assert.False(evento.ExcedeuTentativas);
    }

    [Fact]
    public void ExcedeuTentativas_Com10Tentativas_DeveSerTrue()
    {
        var evento = OutboxEvent.Criar("type", "subject", "{}");
        for (int i = 0; i < 10; i++) evento.IncrementarTentativa();
        Assert.True(evento.ExcedeuTentativas);
    }

    [Fact]
    public void ExcedeuTentativas_Com11Tentativas_DeveSerTrue()
    {
        var evento = OutboxEvent.Criar("type", "subject", "{}");
        for (int i = 0; i < 11; i++) evento.IncrementarTentativa();
        Assert.True(evento.ExcedeuTentativas);
    }
}
