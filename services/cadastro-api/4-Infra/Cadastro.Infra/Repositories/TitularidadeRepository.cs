using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;
using Cadastro.Infra.Data;
using Microsoft.EntityFrameworkCore;

namespace Cadastro.Infra.Repositories;

public class TitularidadeRepository : ITitularidadeRepository
{
    private readonly CadastroDbContext _context;

    public TitularidadeRepository(CadastroDbContext context)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
    }

    public async Task<IEnumerable<TitularidadeAutoral>> GetByObraIdAsync(Guid obraId, CancellationToken ct)
    {
        return await _context.TitularidadesAutorais
            .AsNoTracking()
            .Include(t => t.Titular)
            .ThenInclude(t => t.Associacao)
            .Where(t => t.ObraId == obraId)
            .ToListAsync(ct);
    }

    public async Task<IEnumerable<TitularidadeAutoral>> GetByObraIdsAsync(IEnumerable<Guid> obraIds, CancellationToken ct)
    {
        var obraIdList = obraIds.ToList();
        return await _context.TitularidadesAutorais
            .AsNoTracking()
            .Include(t => t.Titular)
            .ThenInclude(t => t.Associacao)
            .Where(t => obraIdList.Contains(t.ObraId))
            .OrderBy(t => t.Titular.Nome)
            .ToListAsync(ct);
    }

    public async Task<TitularidadeAutoral?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        return await _context.TitularidadesAutorais
            .Include(t => t.Titular)
            .ThenInclude(t => t.Associacao)
            .FirstOrDefaultAsync(t => t.Id == id, ct);
    }

    public async Task<bool> ExisteDuplicataAsync(Guid obraId, Guid titularId, CategoriaAutoral categoria, CancellationToken ct)
    {
        return await _context.TitularidadesAutorais
            .AnyAsync(t => t.ObraId == obraId && t.TitularId == titularId && t.Categoria == categoria, ct);
    }

    public async Task<TitularidadeAutoral> AddAsync(TitularidadeAutoral titularidade, CancellationToken ct)
    {
        var entry = await _context.TitularidadesAutorais.AddAsync(titularidade, ct);
        return entry.Entity;
    }

    public void Update(TitularidadeAutoral titularidade)
    {
        _context.TitularidadesAutorais.Update(titularidade);
    }

    public void Delete(TitularidadeAutoral titularidade)
    {
        _context.TitularidadesAutorais.Remove(titularidade);
    }

    public async Task<decimal> CalcularSomaAsync(Guid obraId, CancellationToken ct)
    {
        return await _context.TitularidadesAutorais
            .Where(t => t.ObraId == obraId)
            .SumAsync(t => t.Percentual, ct);
    }

    public async Task SaveChangesAsync(CancellationToken ct)
    {
        await _context.SaveChangesAsync(ct);
    }
}
