using Cadastro.Domain.Entities;
using Cadastro.Domain.Interfaces;
using Cadastro.Infra.Data;
using Microsoft.EntityFrameworkCore;

namespace Cadastro.Infra.Repositories;

/// <summary>
/// Implementação de <see cref="ISolicitacaoAlteracaoRepository"/> com EF Core.
/// Listagem paginada com filtros por status/titular/campo (RF-17, RF-33).
/// </summary>
public class SolicitacaoAlteracaoRepository : ISolicitacaoAlteracaoRepository
{
    private readonly CadastroDbContext _context;

    public SolicitacaoAlteracaoRepository(CadastroDbContext context)
    {
        _context = context;
    }

    public async Task<(IEnumerable<SolicitacaoAlteracao> Items, int Total)> ListarAsync(
        SolicitacaoFiltro filtro, CancellationToken cancellationToken)
    {
        var query = _context.SolicitacoesAlteracao
            .AsNoTracking()
            .AsQueryable();

        if (filtro.Status.HasValue)
            query = query.Where(s => s.Status == filtro.Status.Value);

        if (filtro.TitularId.HasValue)
            query = query.Where(s => s.TitularId == filtro.TitularId.Value);

        if (filtro.Campo.HasValue)
            query = query.Where(s => s.Campo == filtro.Campo.Value);

        var total = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(s => s.SolicitadaEm)
            .Skip((filtro.Page - 1) * filtro.Size)
            .Take(filtro.Size)
            .ToListAsync(cancellationToken);

        return (items, total);
    }

    public async Task<SolicitacaoAlteracao?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        return await _context.SolicitacoesAlteracao
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
    }

    public async Task<SolicitacaoAlteracao> AddAsync(SolicitacaoAlteracao solicitacao, CancellationToken cancellationToken)
    {
        var entry = await _context.SolicitacoesAlteracao.AddAsync(solicitacao, cancellationToken);
        return entry.Entity;
    }

    public void Update(SolicitacaoAlteracao solicitacao)
    {
        _context.SolicitacoesAlteracao.Update(solicitacao);
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        await _context.SaveChangesAsync(cancellationToken);
    }
}
