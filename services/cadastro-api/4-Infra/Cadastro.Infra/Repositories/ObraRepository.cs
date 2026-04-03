using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;
using Cadastro.Infra.Data;
using Microsoft.EntityFrameworkCore;

namespace Cadastro.Infra.Repositories;

public class ObraRepository : IObraRepository
{
    private readonly CadastroDbContext _context;

    public ObraRepository(CadastroDbContext context)
    {
        _context = context;
    }

    public async Task<(IEnumerable<ObraMusical> Items, int Total)> ListarAsync(
        ObraFiltro filtro, CancellationToken ct)
    {
        var query = _context.ObrasMusicais
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filtro.Titulo))
            query = query.Where(o => EF.Functions.ILike(o.Titulo, $"%{filtro.Titulo}%"));

        if (!string.IsNullOrWhiteSpace(filtro.Iswc))
            query = query.Where(o => o.Iswc == filtro.Iswc);

        if (filtro.Tipo.HasValue)
            query = query.Where(o => o.Tipo == filtro.Tipo.Value);

        if (filtro.Status.HasValue)
            query = query.Where(o => o.Status == filtro.Status.Value);

        if (!string.IsNullOrWhiteSpace(filtro.Genero))
            query = query.Where(o => EF.Functions.ILike(o.Genero!, $"%{filtro.Genero}%"));

        var total = await query.CountAsync(ct);

        query = filtro.Sort switch
        {
            "-titulo" => query.OrderByDescending(o => o.Titulo),
            "iswc" => query.OrderBy(o => o.Iswc),
            "-iswc" => query.OrderByDescending(o => o.Iswc),
            "status" => query.OrderBy(o => o.Status),
            "-status" => query.OrderByDescending(o => o.Status),
            "tipo" => query.OrderBy(o => o.Tipo),
            "-tipo" => query.OrderByDescending(o => o.Tipo),
            "atualizadoem" => query.OrderBy(o => o.AtualizadoEm),
            "-atualizadoem" => query.OrderByDescending(o => o.AtualizadoEm),
            _ => query.OrderBy(o => o.Titulo),
        };

        var items = await query
            .Skip((filtro.Page - 1) * filtro.Size)
            .Take(filtro.Size)
            .ToListAsync(ct);

        return (items, total);
    }

    public async Task<IEnumerable<ObraMusical>> BuscarAsync(string termo, int limit, CancellationToken ct)
    {
        var query = _context.ObrasMusicais.AsNoTracking();

        // ISWC exato
        if (termo.StartsWith("T-", StringComparison.OrdinalIgnoreCase))
            query = query.Where(o => o.Iswc == termo);
        else
            // ILike em título + join com titulares
            query = query.Where(o =>
                EF.Functions.ILike(o.Titulo, $"%{termo}%") ||
                o.TitularidadesAutorais.Any(t => EF.Functions.ILike(t.Titular.Nome, $"%{termo}%")));

        return await query.Take(limit).ToListAsync(ct);
    }

    public async Task<ObraMusical?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        return await _context.ObrasMusicais
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == id, ct);
    }

    public async Task<bool> ExisteIswcAsync(string iswc, CancellationToken ct)
    {
        return await _context.ObrasMusicais
            .AnyAsync(o => o.Iswc == iswc, ct);
    }

    public async Task<bool> ExisteIswcAsync(string iswc, Guid excludeId, CancellationToken ct)
    {
        return await _context.ObrasMusicais
            .AnyAsync(o => o.Id != excludeId && o.Iswc == iswc, ct);
    }

    public async Task<ObraMusical> AddAsync(ObraMusical obra, CancellationToken ct)
    {
        var entry = await _context.ObrasMusicais.AddAsync(obra, ct);
        return entry.Entity;
    }

    public void Update(ObraMusical obra)
    {
        _context.ObrasMusicais.Update(obra);
    }

    public void Delete(ObraMusical obra)
    {
        _context.ObrasMusicais.Remove(obra);
    }

    public async Task<bool> PossuiVinculosAsync(Guid obraId, CancellationToken ct)
    {
        return await _context.TitularidadesAutorais.AnyAsync(t => t.ObraId == obraId, ct) ||
               await _context.Fonogramas.AnyAsync(f => f.ObraId == obraId, ct);
    }

    public async Task SaveChangesAsync(CancellationToken ct)
    {
        await _context.SaveChangesAsync(ct);
    }
}
