using Cadastro.Infra.Data;
using Cadastro.Infra.Events;
using Microsoft.EntityFrameworkCore;

namespace Cadastro.UnitTests.Events;

/// <summary>
/// Testes unitários para OutboxEventWriter:
/// verifica que AddEvent serializa o payload e adiciona OutboxEvent ao DbContext (in-memory).
/// </summary>
public class OutboxEventWriterTests
{
    private static CadastroDbContext BuildInMemoryContext()
    {
        var options = new DbContextOptionsBuilder<CadastroDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new CadastroDbContext(options);
    }

    [Fact]
    public void AddEvent_DeveAdicionarOutboxEventAoDbSet()
    {
        using var context = BuildInMemoryContext();
        var writer = new OutboxEventWriter(context);
        var type = EventTypes.ObraLiberada;
        var subject = Guid.NewGuid().ToString();
        var data = new { obraId = Guid.NewGuid(), titulo = "Teste" };

        writer.AddEvent(type, subject, data);

        Assert.Single(context.OutboxEvents.Local);
    }

    [Fact]
    public void AddEvent_DeveSalvarTypeCorreto()
    {
        using var context = BuildInMemoryContext();
        var writer = new OutboxEventWriter(context);

        writer.AddEvent(EventTypes.FonogramaLiberado, "subject", new { });

        var outboxEvent = context.OutboxEvents.Local.Single();
        Assert.Equal(EventTypes.FonogramaLiberado, outboxEvent.Type);
    }

    [Fact]
    public void AddEvent_DeveSalvarSubjectCorreto()
    {
        using var context = BuildInMemoryContext();
        var writer = new OutboxEventWriter(context);
        var subject = Guid.NewGuid().ToString();

        writer.AddEvent(EventTypes.TitularCriado, subject, new { });

        var outboxEvent = context.OutboxEvents.Local.Single();
        Assert.Equal(subject, outboxEvent.Subject);
    }

    [Fact]
    public void AddEvent_DeveSerializarPayloadComoJson()
    {
        using var context = BuildInMemoryContext();
        var writer = new OutboxEventWriter(context);
        var obraId = Guid.NewGuid();

        writer.AddEvent(EventTypes.ObraLiberada, obraId.ToString(), new { obraId, titulo = "Minha Obra" });

        var outboxEvent = context.OutboxEvents.Local.Single();
        Assert.Contains("obraId", outboxEvent.Payload);
        Assert.Contains("titulo", outboxEvent.Payload);
        Assert.Contains("Minha Obra", outboxEvent.Payload);
    }

    [Fact]
    public void AddEvent_NaoDeveChamarSaveChanges()
    {
        // O evento deve ficar no estado Added, não persistido ainda
        using var context = BuildInMemoryContext();
        var writer = new OutboxEventWriter(context);

        writer.AddEvent(EventTypes.ObraBloqueada, "subject", new { });

        // ChangeTracker deve ter 1 entry no estado Added (não persisted)
        var entries = context.ChangeTracker.Entries().ToList();
        Assert.Single(entries);
        Assert.Equal(Microsoft.EntityFrameworkCore.EntityState.Added, entries[0].State);
    }

    [Fact]
    public void AddEvent_MultiplasChamadas_DeveTerMultiplosEventos()
    {
        using var context = BuildInMemoryContext();
        var writer = new OutboxEventWriter(context);

        writer.AddEvent(EventTypes.ObraLiberada, "s1", new { });
        writer.AddEvent(EventTypes.FonogramaLiberado, "s2", new { });

        Assert.Equal(2, context.OutboxEvents.Local.Count);
    }
}
