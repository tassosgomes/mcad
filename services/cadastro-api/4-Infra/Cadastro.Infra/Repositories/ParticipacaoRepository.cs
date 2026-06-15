using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;
using Cadastro.Infra.Data;
using Microsoft.EntityFrameworkCore;

namespace Cadastro.Infra.Repositories;

public class ParticipacaoRepository : IParticipacaoRepository
{
    private readonly CadastroDbContext _context;

    public ParticipacaoRepository(CadastroDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<ParticipacaoConexa>> GetByFonogramaIdAsync(Guid fonogramaId, CancellationToken ct)
    {
        return await _context.ParticipacoesConexas
            .Include(p => p.Titular)
            .Where(p => p.FonogramaId == fonogramaId)
            .OrderByDescending(p => p.Percentual.HasValue)
            .ThenByDescending(p => p.Percentual)
            .ThenBy(p => p.Titular.Nome)
            .ToListAsync(ct);
    }

    public async Task<IEnumerable<ParticipacaoConexa>> GetByFonogramaIdsAsync(IEnumerable<Guid> fonogramaIds, CancellationToken ct)
    {
        var fonogramaIdList = fonogramaIds.ToList();
        return await _context.ParticipacoesConexas
            .AsNoTracking()
            .Include(p => p.Titular)
            .ThenInclude(t => t.Associacao)
            .Where(p => fonogramaIdList.Contains(p.FonogramaId))
            .OrderBy(p => p.FonogramaId)
            .ThenBy(p => p.Titular.Nome)
            .ToListAsync(ct);
    }

    // RF-23, RF-24, RF-25: lista as participações conexas de um titular (somente leitura).
    // AsNoTracking + Include(Fonograma.Obra) carrega ISRC e título da obra para a projeção.
    public async Task<IEnumerable<ParticipacaoConexa>> GetByTitularIdAsync(Guid titularId, CancellationToken ct)
    {
        return await _context.ParticipacoesConexas
            .AsNoTracking()
            .Include(p => p.Fonograma)
            .ThenInclude(f => f.Obra)
            .Where(p => p.TitularId == titularId)
            .ToListAsync(ct);
    }

    public async Task<ParticipacaoConexa?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        return await _context.ParticipacoesConexas
            .Include(p => p.Titular)
            .FirstOrDefaultAsync(p => p.Id == id, ct);
    }

    public async Task<bool> ExisteDuplicataAsync(Guid fonogramaId, Guid titularId, CategoriaConexo categoria, CancellationToken ct)
    {
        return await _context.ParticipacoesConexas
            .AnyAsync(p => p.FonogramaId == fonogramaId && p.TitularId == titularId && p.Categoria == categoria, ct);
    }

    public async Task<ParticipacaoConexa> AddAsync(ParticipacaoConexa participacao, CancellationToken ct)
    {
        var entry = await _context.ParticipacoesConexas.AddAsync(participacao, ct);
        return entry.Entity;
    }

    public void Delete(ParticipacaoConexa participacao)
    {
        _context.ParticipacoesConexas.Remove(participacao);
    }

    public async Task SaveChangesAsync(CancellationToken ct)
    {
        await _context.SaveChangesAsync(ct);
    }
}
