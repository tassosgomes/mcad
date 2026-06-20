using Identificacao.Domain.Entities;
using Identificacao.Domain.Filters;

namespace Identificacao.Domain.Interfaces;

public interface ICaptacaoRepository
{
    Task<Captacao?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<(IEnumerable<Captacao> Items, int Total)> ListarAsync(ListarCaptacoesFiltro filtro, CancellationToken ct);
    Task<bool> ExisteAtivaParaRubricaPeriodoAsync(Guid rubricaId, DateOnly periodo, Guid? excluirId, CancellationToken ct);
    Task<int> ContarExecucoesAsync(Guid captacaoId, CancellationToken ct);
    Task AddAsync(Captacao captacao, CancellationToken ct);
    Task RemoveAsync(Captacao captacao, CancellationToken ct);
    Task<IReadOnlyList<Captacao>> ListarPorNomeResponsavelAsync(string nome, CancellationToken ct);
    Task SaveChangesAsync(CancellationToken ct);
}
