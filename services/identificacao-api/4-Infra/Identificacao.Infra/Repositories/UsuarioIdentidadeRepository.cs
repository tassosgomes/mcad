using Identificacao.Domain.Identidade;
using Identificacao.Domain.Interfaces;
using Identificacao.Infra.Data;
using Microsoft.EntityFrameworkCore;

namespace Identificacao.Infra.Repositories;

public class UsuarioIdentidadeRepository : IUsuarioIdentidadeRepository
{
    private readonly IdentificacaoDbContext _context;

    public UsuarioIdentidadeRepository(IdentificacaoDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<UsuarioIdentidade>> ListarAtivosAsync(CancellationToken ct)
    {
        return await _context.UsuariosIdentidade
            .AsNoTracking()
            .Where(u => !u.IsSuspended && u.DeletedAtUtc == null)
            .OrderBy(u => u.DisplayName)
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<UsuarioIdentidade>> ListarTodosAsync(CancellationToken ct)
    {
        return await _context.UsuariosIdentidade
            .AsNoTracking()
            .ToListAsync(ct);
    }

    public async Task<UsuarioIdentidade?> BuscarPorSubjectAsync(string logtoUserId, CancellationToken ct)
    {
        return await _context.UsuariosIdentidade
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.LogtoUserId == logtoUserId, ct);
    }
}
