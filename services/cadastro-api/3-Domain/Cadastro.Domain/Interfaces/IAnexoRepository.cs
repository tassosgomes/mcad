using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;

namespace Cadastro.Domain.Interfaces;

public interface IAnexoRepository
{
    Task<Anexo?> GetByIdAsync(Guid id, CancellationToken cancellationToken);

    Task<Anexo?> GetAtivoByIdAsync(Guid id, CancellationToken cancellationToken);

    Task<Anexo?> GetAtivoByEntidadeECategoriaAsync(
        Guid entidadeId, CategoriaAnexo categoria, CancellationToken cancellationToken);

    Task<IEnumerable<Anexo>> ListarAtivosPorEntidadeAsync(
        TipoEntidadeAnexo entidadeTipo, Guid entidadeId, CancellationToken cancellationToken);

    Task<Anexo> AddAsync(Anexo anexo, CancellationToken cancellationToken);

    void Update(Anexo anexo);

    Task SaveChangesAsync(CancellationToken cancellationToken);
}
