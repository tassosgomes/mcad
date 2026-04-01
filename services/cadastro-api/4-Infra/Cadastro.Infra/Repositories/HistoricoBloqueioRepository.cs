using Cadastro.Domain.Entities;
using Cadastro.Domain.Interfaces;
using Cadastro.Infra.Data;
using Microsoft.EntityFrameworkCore;

namespace Cadastro.Infra.Repositories;

public class HistoricoBloqueioRepository : IHistoricoBloqueioRepository
{
    private readonly CadastroDbContext _context;

    public HistoricoBloqueioRepository(CadastroDbContext context)
    {
        _context = context;
    }

    public void Add(HistoricoBloqueio historico)
    {
        _context.HistoricoBloqueios.Add(historico);
    }

    public async Task<IEnumerable<HistoricoBloqueio>> GetByEntidadeAsync(string entidadeTipo, Guid entidadeId, CancellationToken cancellationToken = default)
    {
        return await _context.HistoricoBloqueios
            .Where(h => h.EntidadeTipo == entidadeTipo && h.EntidadeId == entidadeId)
            .OrderByDescending(h => h.DataHora)
            .ToListAsync(cancellationToken);
    }
}
