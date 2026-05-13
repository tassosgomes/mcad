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

}
