using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;

namespace Cadastro.Domain.Interfaces;

public interface IParticipacaoRepository
{
    Task<IEnumerable<ParticipacaoConexa>> GetByFonogramaIdAsync(Guid fonogramaId, CancellationToken ct);
    Task<IEnumerable<ParticipacaoConexa>> GetByFonogramaIdsAsync(IEnumerable<Guid> fonogramaIds, CancellationToken ct);
    Task<IEnumerable<ParticipacaoConexa>> GetByTitularIdAsync(Guid titularId, CancellationToken ct);
    Task<ParticipacaoConexa?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<bool> ExisteDuplicataAsync(Guid fonogramaId, Guid titularId, CategoriaConexo categoria, CancellationToken ct);
    Task<ParticipacaoConexa> AddAsync(ParticipacaoConexa participacao, CancellationToken ct);
    void Delete(ParticipacaoConexa participacao);
    Task SaveChangesAsync(CancellationToken ct);
}
