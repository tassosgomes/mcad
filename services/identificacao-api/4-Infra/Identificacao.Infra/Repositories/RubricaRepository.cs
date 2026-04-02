using Identificacao.Domain.Entities;
using Identificacao.Domain.Interfaces;
using Identificacao.Infra.Data;
using Microsoft.EntityFrameworkCore;

namespace Identificacao.Infra.Repositories;

public class RubricaRepository : IRubricaRepository
{
    private readonly IdentificacaoDbContext _context;

    public RubricaRepository(IdentificacaoDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Rubrica>> GetAllAsync(CancellationToken ct)
    {
        return await _context.Rubricas.AsNoTracking().ToListAsync(ct);
    }
}
