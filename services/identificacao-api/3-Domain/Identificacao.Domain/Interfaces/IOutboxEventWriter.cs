namespace Identificacao.Domain.Interfaces;

public interface IOutboxEventWriter
{
    void AddEvent(string eventType, string subject, object data);
}
