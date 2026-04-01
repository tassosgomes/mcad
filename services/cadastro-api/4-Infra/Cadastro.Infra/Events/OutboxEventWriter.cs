using System.Text.Json;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Interfaces;
using Cadastro.Infra.Data;

namespace Cadastro.Infra.Events;

/// <summary>
/// Implementação de IOutboxEventWriter: serializa o payload e adiciona o OutboxEvent
/// ao DbContext. O evento não é salvo imediatamente — será persistido na mesma
/// transação que a entidade de domínio quando o handler chamar SaveChangesAsync().
/// Isso garante atomicidade: entidade + outbox na mesma transação (RF-17).
/// </summary>
public class OutboxEventWriter : IOutboxEventWriter
{
    private readonly CadastroDbContext _context;

    public OutboxEventWriter(CadastroDbContext context) => _context = context;

    /// <inheritdoc />
    public void AddEvent(string eventType, string subject, object data)
    {
        var payload = JsonSerializer.Serialize(data);
        var outboxEvent = OutboxEvent.Criar(eventType, subject, payload);
        _context.OutboxEvents.Add(outboxEvent);
        // Nota: não chama SaveChanges — o handler faz isso, garantindo atomicidade
    }
}
