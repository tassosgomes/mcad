using Identificacao.Domain.Entities;

namespace Identificacao.Domain.Interfaces;

public interface IRubricaRepository
{
    Task<IEnumerable<Rubrica>> GetAllAsync(CancellationToken ct);
}
