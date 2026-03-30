using Cadastro.Domain.Entities;

namespace Cadastro.Domain.Interfaces;

/// <summary>
/// Contrato read-only do repositório de Associações.
/// Não expõe operações de escrita — dados são imutáveis por design (RF-04).
/// </summary>
public interface IAssociacaoRepository
{
    Task<IEnumerable<Associacao>> GetAllAsync(CancellationToken cancellationToken);
    Task<Associacao?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
}
