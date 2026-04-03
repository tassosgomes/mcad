using Identificacao.Domain.Entities;

namespace Identificacao.Domain.Interfaces;

public interface ITipoUtilizacaoRepository
{
    Task<IEnumerable<TipoUtilizacao>> ListarAsync(CancellationToken ct);
    Task<TipoUtilizacao?> GetByIdAsync(Guid id, CancellationToken ct);
}
