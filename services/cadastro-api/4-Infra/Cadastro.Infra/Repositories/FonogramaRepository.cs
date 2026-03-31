using Cadastro.Domain.Entities;
using Cadastro.Domain.Interfaces;
using Cadastro.Infra.Data;
using Microsoft.EntityFrameworkCore;

namespace Cadastro.Infra.Repositories;

public class FonogramaRepository : IFonogramaRepository
{
    private readonly CadastroDbContext _context;

    public FonogramaRepository(CadastroDbContext context)
    {
        _context = context;
    }

    public async Task<(IEnumerable<Fonograma> Items, int Total)> ListarAsync(FonogramaFiltro filtro, CancellationToken ct)
    {
        var query = _context.Set<Fonograma>()
            .Include(f => f.Obra)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filtro.Isrc))
        {
            var isrcLimpo = filtro.Isrc.Replace("-", "").ToUpperInvariant();
            query = query.Where(f => f.Isrc.Valor.Contains(isrcLimpo));
        }

        if (filtro.ObraId.HasValue)
        {
            query = query.Where(f => f.ObraId == filtro.ObraId.Value);
        }

        if (!string.IsNullOrWhiteSpace(filtro.ObraTitulo))
        {
            query = query.Where(f => EF.Functions.ILike(f.Obra.Titulo, $"%{filtro.ObraTitulo}%"));
        }

        if (filtro.Status.HasValue)
        {
            query = query.Where(f => f.Status == filtro.Status.Value);
        }

        if (!string.IsNullOrWhiteSpace(filtro.Pais))
        {
            query = query.Where(f => EF.Functions.ILike(f.PaisOrigem, $"%{filtro.Pais}%"));
        }

        var total = await query.CountAsync(ct);

        query = filtro.Sort?.ToLowerInvariant() switch
        {
            "isrc_desc" => query.OrderByDescending(f => f.Isrc.Valor),
            "obra" => query.OrderBy(f => f.Obra.Titulo),
            "obra_desc" => query.OrderByDescending(f => f.Obra.Titulo),
            "status" => query.OrderBy(f => f.Status),
            "status_desc" => query.OrderByDescending(f => f.Status),
            "pais" => query.OrderBy(f => f.PaisOrigem),
            "pais_desc" => query.OrderByDescending(f => f.PaisOrigem),
            _ => query.OrderBy(f => f.Isrc.Valor)
        };

        var items = await query
            .Skip((filtro.Page - 1) * filtro.Size)
            .Take(filtro.Size)
            .ToListAsync(ct);

        return (items, total);
    }

    public async Task<IEnumerable<Fonograma>> GetByObraIdAsync(Guid obraId, CancellationToken ct)
    {
        return await _context.Set<Fonograma>()
            .Include(f => f.Obra)
            .Where(f => f.ObraId == obraId)
            .OrderBy(f => f.Isrc.Valor)
            .ToListAsync(ct);
    }

    public async Task<Fonograma?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        return await _context.Set<Fonograma>()
            .Include(f => f.Obra)
            .FirstOrDefaultAsync(f => f.Id == id, ct);
    }

    public async Task<bool> ExisteIsrcAsync(string isrc, CancellationToken ct)
    {
        return await _context.Set<Fonograma>()
            .AnyAsync(f => f.Isrc.Valor == isrc, ct);
    }

    public async Task<bool> ExisteIsrcAsync(string isrc, Guid excludeId, CancellationToken ct)
    {
        return await _context.Set<Fonograma>()
            .AnyAsync(f => f.Isrc.Valor == isrc && f.Id != excludeId, ct);
    }

    public async Task<Fonograma> AddAsync(Fonograma fonograma, CancellationToken ct)
    {
        await _context.Set<Fonograma>().AddAsync(fonograma, ct);
        return fonograma;
    }

    public void Update(Fonograma fonograma)
    {
        _context.Set<Fonograma>().Update(fonograma);
    }

    public void Delete(Fonograma fonograma)
    {
        _context.Set<Fonograma>().Remove(fonograma);
    }

    public async Task SaveChangesAsync(CancellationToken ct)
    {
        await _context.SaveChangesAsync(ct);
    }
}
