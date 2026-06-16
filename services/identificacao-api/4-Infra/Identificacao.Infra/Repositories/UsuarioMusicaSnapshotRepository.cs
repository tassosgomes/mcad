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

    public async Task<(List<UsuarioMusicaSnapshot> Items, int Total)> BuscarAsync(string q, string? cnpj, int page, int size, CancellationToken ct)
    {
        var query = _context.UsuariosMusicaSnapshot
            .AsNoTracking()
            .Where(u => u.Status == "ATIVO");

        if (q.Length >= 2)
            query = query.Where(u => u.RazaoSocial.ToLower().Contains(q.ToLower()));

        if (!string.IsNullOrEmpty(cnpj))
            query = query.Where(u => u.Cnpj == cnpj);

        var total = await query.CountAsync(ct);

        var items = await query
            .OrderBy(u => u.RazaoSocial)
            .Skip((page - 1) * size)
            .Take(size)
            .ToListAsync(ct);

        return (items, total);
    }

    public async Task SaveChangesAsync(CancellationToken ct)
    {
        await _context.SaveChangesAsync(ct);
    }
}
