using Cadastro.Domain.Entities;
using Cadastro.Domain.Interfaces;
using Cadastro.Infra.Data;
using Microsoft.EntityFrameworkCore;

namespace Cadastro.Infra.Repositories;

/// <summary>
/// Implementação read-only do IAssociacaoRepository.
/// AsNoTracking em todas as queries — feature 100% read-only.
/// </summary>
public class AssociacaoRepository : IAssociacaoRepository
{
    private readonly CadastroDbContext _context;

    public AssociacaoRepository(CadastroDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Associacao>> GetAllAsync(CancellationToken cancellationToken)
    {
        return await _context.Associacoes
            .AsNoTracking()
            .OrderBy(a => a.Sigla)
            .ToListAsync(cancellationToken);
    }

    public async Task<Associacao?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        return await _context.Associacoes
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);
    }
}
