using Identificacao.Domain.Entities;
using Identificacao.Domain.Interfaces;
using Identificacao.Infra.Data;
using Microsoft.EntityFrameworkCore;

namespace Identificacao.Infra.Repositories;

public class UsuarioMusicaSnapshotRepository : IUsuarioMusicaSnapshotRepository
{
    private readonly IdentificacaoDbContext _context;

    public UsuarioMusicaSnapshotRepository(IdentificacaoDbContext context)
    {
        _context = context;
    }

    public async Task<UsuarioMusicaSnapshot?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        return await _context.UsuariosMusicaSnapshot
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == id, ct);
    }

    public async Task UpsertAsync(UsuarioMusicaSnapshot snapshot, CancellationToken ct)
    {
        var existing = await _context.UsuariosMusicaSnapshot.FindAsync([snapshot.Id], ct);
        if (existing is null)
        {
            await _context.UsuariosMusicaSnapshot.AddAsync(snapshot, ct);
        }
        else
        {
            _context.Entry(existing).CurrentValues.SetValues(snapshot);
        }
    }

    public async Task SaveChangesAsync(CancellationToken ct)
    {
        await _context.SaveChangesAsync(ct);
    }
}
