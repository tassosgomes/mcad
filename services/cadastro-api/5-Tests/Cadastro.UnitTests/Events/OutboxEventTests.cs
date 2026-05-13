using Cadastro.Domain.Entities;

namespace Cadastro.UnitTests.Events;

/// <summary>
/// Testes unitários para a entidade OutboxEvent:
/// Criar, MarcarPublicado, IncrementarTentativa, ExcedeuTentativas.
/// </summary>
public class OutboxEventTests
{
    // ── MarcarPublicado ───────────────────────────────────────────────────────

    [Fact]
    public void MarcarPublicado_DevePreencherPublishedAt()
    {
        var evento = OutboxEvent.Criar("type", "subject", "{}");
        evento.MarcarPublicado();
        Assert.NotNull(evento.PublishedAt);
    }

    // ── IncrementarTentativa ──────────────────────────────────────────────────

    [Fact]
    public void IncrementarTentativa_DeveAumentarAttempts()
    {
        var evento = OutboxEvent.Criar("type", "subject", "{}");
        evento.IncrementarTentativa();
        Assert.Equal(1, evento.Attempts);
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

}
