using Identificacao.Domain.Entities;
using Identificacao.Domain.Interfaces;
using Identificacao.Infra.Data;
using Microsoft.EntityFrameworkCore;

namespace Identificacao.Infra.Repositories;

public class TipoUtilizacaoRepository : ITipoUtilizacaoRepository
{
    private readonly IdentificacaoDbContext _context;

    public TipoUtilizacaoRepository(IdentificacaoDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<TipoUtilizacao>> ListarAsync(CancellationToken ct)
    {
        return await _context.TiposUtilizacao
            .AsNoTracking()
            .OrderBy(t => t.Descricao)
            .ToListAsync(ct);
    }

    public async Task<TipoUtilizacao?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        return await _context.TiposUtilizacao
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == id, ct);
    }
}
