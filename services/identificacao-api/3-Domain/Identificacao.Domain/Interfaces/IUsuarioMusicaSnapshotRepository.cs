using Identificacao.Domain.Entities;

namespace Identificacao.Domain.Interfaces;

public interface IUsuarioMusicaSnapshotRepository
{
    Task UpsertAsync(UsuarioMusicaSnapshot snapshot, CancellationToken ct);
    Task<UsuarioMusicaSnapshot?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<(List<UsuarioMusicaSnapshot> Items, int Total)> BuscarAsync(string q, string? cnpj, int page, int size, CancellationToken ct);
    Task SaveChangesAsync(CancellationToken ct);
}
