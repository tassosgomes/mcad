using Cadastro.Domain.Entities;

namespace Cadastro.Domain.Interfaces;

/// <summary>
/// Contrato do repositório de <see cref="Ocorrencia"/>.
/// Listagem paginada com filtros por status, titular e tipo (RF-29, RF-33).
/// </summary>
public interface IOcorrenciaRepository
{
    Task<(IEnumerable<Ocorrencia> Items, int Total)> ListarAsync(
        OcorrenciaFiltro filtro, CancellationToken cancellationToken);

    Task<Ocorrencia?> GetByIdAsync(Guid id, CancellationToken cancellationToken);

    Task<Ocorrencia> AddAsync(Ocorrencia ocorrencia, CancellationToken cancellationToken);

    void Update(Ocorrencia ocorrencia);

    Task SaveChangesAsync(CancellationToken cancellationToken);
}
