using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;

namespace Cadastro.Domain.Interfaces;

public interface ITitularidadeRepository
{
    Task<IEnumerable<TitularidadeAutoral>> GetByObraIdAsync(Guid obraId, CancellationToken ct);
    Task<IEnumerable<TitularidadeAutoral>> GetByObraIdsAsync(IEnumerable<Guid> obraIds, CancellationToken ct);
    Task<TitularidadeAutoral?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<bool> ExisteDuplicataAsync(Guid obraId, Guid titularId, CategoriaAutoral categoria, CancellationToken ct);
    Task<TitularidadeAutoral> AddAsync(TitularidadeAutoral titularidade, CancellationToken ct);
    void Update(TitularidadeAutoral titularidade);
    void Delete(TitularidadeAutoral titularidade);
    Task<decimal> CalcularSomaAsync(Guid obraId, CancellationToken ct);
    Task SaveChangesAsync(CancellationToken ct);
}
