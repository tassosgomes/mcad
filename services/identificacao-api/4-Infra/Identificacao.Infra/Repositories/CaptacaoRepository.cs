using Identificacao.Domain.Entities;
using Identificacao.Domain.Enums;
using Identificacao.Domain.Interfaces;
using Identificacao.Infra.Data;
using Microsoft.EntityFrameworkCore;

namespace Identificacao.Infra.Repositories;

public class CaptacaoRepository : ICaptacaoRepository
{
    private readonly IdentificacaoDbContext _context;

    public CaptacaoRepository(IdentificacaoDbContext context)
    {
        _context = context;
    }

    public async Task<Captacao?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        return await _context.Captacoes
            .Include(c => c.Rubrica)
            .FirstOrDefaultAsync(c => c.Id == id, ct);
    }

    public async Task<(IEnumerable<Captacao> Items, int Total)> ListarAsync(dynamic filtro, CancellationToken ct)
    {
        var query = _context.Captacoes.AsNoTracking().Include(c => c.Rubrica).AsQueryable();

        if (filtro.RubricaId != null)
        {
            var rubricaId = (Guid)filtro.RubricaId;
            query = query.Where(c => c.RubricaId == rubricaId);
        }

        if (filtro.PeriodoInicial != null)
        {
            var pIni = (DateOnly)filtro.PeriodoInicial;
            query = query.Where(c => c.Periodo >= pIni);
        }

        if (filtro.PeriodoFinal != null)
        {
            var pFim = (DateOnly)filtro.PeriodoFinal;
            query = query.Where(c => c.Periodo <= pFim);
        }

        if (filtro.Status != null)
        {
            var statusStr = (string)filtro.Status;
            if (Enum.TryParse<StatusCaptacao>(statusStr, true, out var status))
            {
                query = query.Where(c => c.Status == status);
            }
        }

        if (filtro.AnalistaResponsavelId != null)
        {
            var analistaId = (Guid)filtro.AnalistaResponsavelId;
            query = query.Where(c => c.AnalistaResponsavelId == analistaId);
        }

        var sort = ((string)filtro.Sort) ?? "-periodo";

        query = sort switch
        {
            "periodo" => query.OrderBy(c => c.Periodo),
            "-periodo" => query.OrderByDescending(c => c.Periodo),
            "criadoEm" => query.OrderBy(c => c.CriadoEm),
            "-criadoEm" => query.OrderByDescending(c => c.CriadoEm),
            "rubrica" => query.OrderBy(c => c.Rubrica!.Nome),
            "-rubrica" => query.OrderByDescending(c => c.Rubrica!.Nome),
            _ => query.OrderByDescending(c => c.Periodo)
        };

        var total = await query.CountAsync(ct);

        int page = filtro.Page ?? 1;
        int size = filtro.Size ?? 10;

        var items = await query.Skip((page - 1) * size).Take(size).ToListAsync(ct);

        return (items, total);
    }

    public async Task<bool> ExisteAtivaParaRubricaPeriodoAsync(Guid rubricaId, DateOnly periodo, Guid? excluirId, CancellationToken ct)
    {
        return await _context.Captacoes
            .Where(c => c.RubricaId == rubricaId && c.Periodo == periodo && c.Status != StatusCaptacao.Cancelada)
            .Where(c => excluirId == null || c.Id != excluirId)
            .AnyAsync(ct);
    }

    public Task<int> ContarExecucoesAsync(Guid captacaoId, CancellationToken ct)
    {
        // Resolução futura. Assume 0 por agora pois não temos a tabela Execucoes
        return Task.FromResult(0);
    }

    public async Task AddAsync(Captacao captacao, CancellationToken ct)
    {
        await _context.Captacoes.AddAsync(captacao, ct);
    }

    public Task RemoveAsync(Captacao captacao, CancellationToken ct)
    {
        _context.Captacoes.Remove(captacao);
        return Task.CompletedTask;
    }

    public async Task<int> SaveChangesAsync(CancellationToken ct)
    {
        return await _context.SaveChangesAsync(ct);
    }

    async Task ICaptacaoRepository.SaveChangesAsync(CancellationToken ct)
    {
        await _context.SaveChangesAsync(ct);
    }
}
