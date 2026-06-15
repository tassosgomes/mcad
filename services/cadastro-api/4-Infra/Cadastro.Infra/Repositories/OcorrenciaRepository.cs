using Cadastro.Domain.Entities;
using Cadastro.Domain.Interfaces;
using Cadastro.Infra.Data;
using Microsoft.EntityFrameworkCore;

namespace Cadastro.Infra.Repositories;

/// <summary>
/// Implementação de <see cref="IOcorrenciaRepository"/> com EF Core.
/// Listagem paginada com filtros por status/titular/tipo (RF-29, RF-33).
/// </summary>
public class OcorrenciaRepository : IOcorrenciaRepository
{
    private readonly CadastroDbContext _context;

    public OcorrenciaRepository(CadastroDbContext context)
    {
        _context = context;
    }

    public async Task<(IEnumerable<Ocorrencia> Items, int Total)> ListarAsync(
        OcorrenciaFiltro filtro, CancellationToken cancellationToken)
    {
        var query = _context.Ocorrencias
            .AsNoTracking()
            .AsQueryable();

        if (filtro.Status.HasValue)
            query = query.Where(o => o.Status == filtro.Status.Value);

        if (filtro.TitularId.HasValue)
            query = query.Where(o => o.TitularId == filtro.TitularId.Value);

        if (filtro.Tipo.HasValue)
            query = query.Where(o => o.Tipo == filtro.Tipo.Value);

        var total = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(o => o.AbertaEm)
            .Skip((filtro.Page - 1) * filtro.Size)
            .Take(filtro.Size)
            .ToListAsync(cancellationToken);

        return (items, total);
    }

    public async Task<Ocorrencia?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        return await _context.Ocorrencias
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == id, cancellationToken);
    }

    public async Task<Ocorrencia> AddAsync(Ocorrencia ocorrencia, CancellationToken cancellationToken)
    {
        var entry = await _context.Ocorrencias.AddAsync(ocorrencia, cancellationToken);
        return entry.Entity;
    }

    public void Update(Ocorrencia ocorrencia)
    {
        _context.Ocorrencias.Update(ocorrencia);
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        await _context.SaveChangesAsync(cancellationToken);
    }
}
