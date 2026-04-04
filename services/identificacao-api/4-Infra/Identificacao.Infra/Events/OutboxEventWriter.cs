using System.Text.Json;
using Identificacao.Domain.Entities;
using Identificacao.Domain.Interfaces;
using Identificacao.Infra.Data;

namespace Identificacao.Infra.Events;

public class OutboxEventWriter : IOutboxEventWriter
{
    private readonly IdentificacaoDbContext _context;

    public OutboxEventWriter(IdentificacaoDbContext context) => _context = context;

    public void AddEvent(string eventType, string subject, object data)
    {
        var payload = JsonSerializer.Serialize(data);
        var outboxEvent = OutboxEvent.Criar(eventType, subject, payload);
        _context.OutboxEvents.Add(outboxEvent);
    }
}
