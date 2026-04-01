using Cadastro.Domain.Entities;

namespace Cadastro.Domain.Interfaces;

public interface IHistoricoBloqueioRepository
{
    void Add(HistoricoBloqueio historico);
    Task<IEnumerable<HistoricoBloqueio>> GetByEntidadeAsync(string entidadeTipo, Guid entidadeId, CancellationToken cancellationToken = default);
}
