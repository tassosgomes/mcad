using Identificacao.Domain.Entities;

namespace Identificacao.Domain.Interfaces;

public interface ICaptacaoRepository
{
    Task<Captacao?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<(IEnumerable<Captacao> Items, int Total)> ListarAsync(dynamic filtro, CancellationToken ct); // TODO: Replace dynamic with ListarCaptacoesQuery
    Task<bool> ExisteAtivaParaRubricaPeriodoAsync(Guid rubricaId, DateOnly periodo, Guid? excluirId, CancellationToken ct);
    Task<int> ContarExecucoesAsync(Guid captacaoId, CancellationToken ct);
    Task AddAsync(Captacao captacao, CancellationToken ct);
    Task RemoveAsync(Captacao captacao, CancellationToken ct);
    Task SaveChangesAsync(CancellationToken ct);
}
