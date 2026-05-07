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

        if (filtro.Codigo.HasValue)
            query = query.Where(f => f.Codigo == filtro.Codigo.Value);

        if (!string.IsNullOrWhiteSpace(filtro.Isrc))
        {
            var isrcLimpo = filtro.Isrc.Replace("-", "").ToUpperInvariant();
            if (isrcLimpo.Length == 12)
            {
                try
                {
                    var isrcVo = Cadastro.Domain.ValueObjects.Isrc.Create(isrcLimpo);
                    query = query.Where(f => f.Isrc == isrcVo);
                }
                catch
                {
                    query = AplicarFiltroParcialIsrc(query, isrcLimpo);
                }
            }
            else
            {
                query = AplicarFiltroParcialIsrc(query, isrcLimpo);
            }
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

        // Normaliza "campo,direção" (ex: "isrc,desc") para "campo_direção" (ex: "isrc_desc")
        var sortKey = filtro.Sort?.ToLowerInvariant() ?? "isrc";
        if (sortKey.Contains(','))
        {
            var parts = sortKey.Split(',', 2);
            sortKey = $"{parts[0].Trim()}_{parts[1].Trim()}";
        }

        query = sortKey switch
        {
            "isrc_desc"  => query.OrderByDescending(f => f.Isrc),
            "obra"       => query.OrderBy(f => f.Obra.Titulo),
            "obra_desc"  => query.OrderByDescending(f => f.Obra.Titulo),
            "status"     => query.OrderBy(f => f.Status),
            "status_desc"=> query.OrderByDescending(f => f.Status),
            "pais"       => query.OrderBy(f => f.PaisOrigem),
            "pais_desc"  => query.OrderByDescending(f => f.PaisOrigem),
            _            => query.OrderBy(f => f.Isrc)
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
            .OrderBy(f => f.Isrc)
            .ToListAsync(ct);
    }

    public async Task<Fonograma?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        return await _context.Set<Fonograma>()
            .Include(f => f.Obra)
            .FirstOrDefaultAsync(f => f.Id == id, ct);
    }

    public async Task<IEnumerable<Fonograma>> GetByIdsAsync(IEnumerable<Guid> ids, CancellationToken ct)
    {
        var idList = ids.ToList();
        return await _context.Set<Fonograma>()
            .AsNoTracking()
            .Where(f => idList.Contains(f.Id))
            .OrderBy(f => f.Isrc)
            .ToListAsync(ct);
    }

    public async Task<bool> ExisteIsrcAsync(string isrc, CancellationToken ct)
    {
        var isrcVo = Cadastro.Domain.ValueObjects.Isrc.Create(isrc);
        return await _context.Set<Fonograma>()
            .AnyAsync(f => f.Isrc == isrcVo, ct);
    }

    public async Task<bool> ExisteIsrcAsync(string isrc, Guid excludeId, CancellationToken ct)
    {
        var isrcVo = Cadastro.Domain.ValueObjects.Isrc.Create(isrc);
        return await _context.Set<Fonograma>()
            .AnyAsync(f => f.Isrc == isrcVo && f.Id != excludeId, ct);
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

    public async Task<IEnumerable<Fonograma>> BuscarAsync(string termo, int limit, CancellationToken ct)
    {
        var query = _context.Set<Fonograma>()
            .AsNoTracking()
            .Include(f => f.Obra)
            .Include(f => f.ParticipacoesConexas)
                .ThenInclude(p => p.Titular)
            .AsQueryable();

        var termoLimpo = termo.Replace("-", "").ToUpperInvariant();
        if (termoLimpo.Length == 12 && termoLimpo.All(char.IsLetterOrDigit))
        {
            try 
            {
                var isrcVo = Cadastro.Domain.ValueObjects.Isrc.Create(termoLimpo);
                query = query.Where(f => f.Isrc == isrcVo);
            }
            catch (Cadastro.Domain.Exceptions.DomainException)
            {
                // Se o termo tem 12 caracteres mas não é um ISRC válido (por ex: falha na mask)
                query = fallbackQuery(query, termo);
            }
        }
        else
        {
            query = fallbackQuery(query, termo);
        }

        return await query.Take(limit).ToListAsync(ct);

        static IQueryable<Fonograma> fallbackQuery(IQueryable<Fonograma> q, string t) =>
            q.Where(f =>
                EF.Functions.ILike(f.Obra.Titulo, $"%{t}%") ||
                f.ParticipacoesConexas.Any(p => EF.Functions.ILike(p.Titular.Nome, $"%{t}%")));
    }

    public async Task SaveChangesAsync(CancellationToken ct)
    {
        await _context.SaveChangesAsync(ct);
    }

    private IQueryable<Fonograma> AplicarFiltroParcialIsrc(IQueryable<Fonograma> query, string isrcParcial)
    {
        var pattern = $"%{isrcParcial}%";

        var matchingIds = _context.Database
            .SqlQuery<Guid>($"""
                SELECT "Id" AS "Value"
                FROM cadastro.fonogramas
                WHERE "Isrc" ILIKE {pattern}
                """);

        return query.Where(f => matchingIds.Contains(f.Id));
    }
}
