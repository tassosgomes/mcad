using Identificacao.Domain.Entities;

namespace Identificacao.Domain.Interfaces;

public interface IUsuarioMusicaSnapshotRepository
{
    Task UpsertAsync(UsuarioMusicaSnapshot snapshot, CancellationToken ct);
    Task<UsuarioMusicaSnapshot?> GetByIdAsync(Guid id, CancellationToken ct);
    Task SaveChangesAsync(CancellationToken ct);
}
