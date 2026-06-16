using System.Text.Json;
using FluentAssertions;
using Identificacao.Domain.Entities;
using Identificacao.IntegrationTests.Fixtures;
using Identificacao.Infra.Events;

namespace Identificacao.IntegrationTests.Events;

[Collection(PostgresCollection.Name)]
public class OutboxEventWriterTests
{
    private readonly PostgresFixture _fixture;

    public OutboxEventWriterTests(PostgresFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task AddEvent_SerializaPayloadComoJson_EPersisteComSaveChanges()
    {
        await _fixture.ResetAsync();
        await using var ctx = _fixture.CreateDbContext();
        var writer = new OutboxEventWriter(ctx);

        var payload = new { CaptacaoId = Guid.NewGuid(), Status = "FECHADA", Total = 42 };
        writer.AddEvent("identificacao.rol.fechado", payload.CaptacaoId.ToString(), payload);
        await ctx.SaveChangesAsync();

        await using var ctxRead = _fixture.CreateDbContext();
        var saved = ctxRead.OutboxEvents.Single();

        saved.Type.Should().Be("identificacao.rol.fechado");
        saved.RoutingKey.Should().Be("identificacao.rol.fechado");
        saved.Subject.Should().Be(payload.CaptacaoId.ToString());
        saved.PublishedAt.Should().BeNull();
        saved.Attempts.Should().Be(0);

        var parsed = JsonDocument.Parse(saved.Payload).RootElement;
        parsed.GetProperty("Status").GetString().Should().Be("FECHADA");
        parsed.GetProperty("Total").GetInt32().Should().Be(42);
    }

    [Fact]
    public async Task AddEvent_SemSaveChanges_NaoPersisteNoBanco()
    {
        // Garantia do Outbox Pattern: a chamada `AddEvent` apenas insere no change tracker.
        // Sem SaveChanges, nada deve ser persistido — provando que o evento entra ou não
        // junto com a transação da entidade.
        await _fixture.ResetAsync();
        await using (var ctx = _fixture.CreateDbContext())
        {
            var writer = new OutboxEventWriter(ctx);
            writer.AddEvent("evento.teste", "subject", new { foo = "bar" });
            // Propositalmente sem ctx.SaveChangesAsync()
        }

        await using var ctxRead = _fixture.CreateDbContext();
        ctxRead.OutboxEvents.Should().BeEmpty();
    }

    [Fact]
    public async Task AddEvent_AtomicidadeEntidadeMaisOutbox_FalhaDeUmReverteAmbos()
    {
        // Cenário Outbox Pattern: entidade e evento devem ser commitados juntos.
        // Aqui forçamos uma falha em SaveChanges (violação de FK inexistente) e verificamos
        // que NEM a entidade NEM o evento foram persistidos — atomicidade preservada.
        await _fixture.ResetAsync();

        await using (var ctx = _fixture.CreateDbContext())
        {
            var writer = new OutboxEventWriter(ctx);

            // Captação com RubricaId inválida (FK violada) — não há rubrica com esse Id
            var captacaoInvalida = Captacao.Criar(Guid.NewGuid(), new DateOnly(2026, 1, 1), Guid.NewGuid(), "U", Guid.NewGuid(), "A");
            ctx.Captacoes.Add(captacaoInvalida);
            writer.AddEvent("evento.deveriaCair", captacaoInvalida.Id.ToString(), new { x = 1 });

            Func<Task> act = () => ctx.SaveChangesAsync();
            await act.Should().ThrowAsync<Microsoft.EntityFrameworkCore.DbUpdateException>();
        }

        await using var ctxVerify = _fixture.CreateDbContext();
        ctxVerify.OutboxEvents.Should().BeEmpty();
        ctxVerify.Captacoes.Should().BeEmpty();
    }

    [Fact]
    public async Task AddEvent_MultiplosEventos_PreservamOrdemPorCreatedAt()
    {
        await _fixture.ResetAsync();
        await using var ctx = _fixture.CreateDbContext();
        var writer = new OutboxEventWriter(ctx);

        writer.AddEvent("type.a", "sub-a", new { idx = 1 });
        writer.AddEvent("type.b", "sub-b", new { idx = 2 });
        writer.AddEvent("type.c", "sub-c", new { idx = 3 });
        await ctx.SaveChangesAsync();

        await using var ctxRead = _fixture.CreateDbContext();
        var eventos = ctxRead.OutboxEvents.OrderBy(e => e.CreatedAt).Select(e => e.Type).ToList();

        eventos.Should().Equal("type.a", "type.b", "type.c");
    }
}
