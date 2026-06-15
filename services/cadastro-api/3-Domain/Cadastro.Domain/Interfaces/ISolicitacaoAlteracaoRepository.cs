using Cadastro.Domain.Entities;

namespace Cadastro.Domain.Interfaces;

/// <summary>
/// Contrato do repositório de <see cref="SolicitacaoAlteracao"/>.
/// Listagem paginada com filtros por status, titular e campo (RF-17, RF-33).
/// </summary>
public interface ISolicitacaoAlteracaoRepository
{
    Task<(IEnumerable<SolicitacaoAlteracao> Items, int Total)> ListarAsync(
        SolicitacaoFiltro filtro, CancellationToken cancellationToken);

    Task<SolicitacaoAlteracao?> GetByIdAsync(Guid id, CancellationToken cancellationToken);

    Task<SolicitacaoAlteracao> AddAsync(SolicitacaoAlteracao solicitacao, CancellationToken cancellationToken);

    void Update(SolicitacaoAlteracao solicitacao);

    Task SaveChangesAsync(CancellationToken cancellationToken);
}
