using Identificacao.Domain.Entities;
using Identificacao.Domain.Enums;
using Identificacao.Domain.Interfaces;
using Identificacao.Infra.Data;
using Microsoft.EntityFrameworkCore;

namespace Identificacao.Infra.Repositories;

public class ExecucaoRepository : IExecucaoRepository
{
    private readonly IdentificacaoDbContext _context;

    public ExecucaoRepository(IdentificacaoDbContext context)
    {
        _context = context;
    }

    public async Task<Execucao?> GetByIdAsync(Guid captacaoId, Guid id, CancellationToken ct)
    {
        return await _context.Execucoes
            .Include(e => e.Captacao)
            .ThenInclude(c => c.Rubrica)
            .Include(e => e.TipoUtilizacao)
            .FirstOrDefaultAsync(e => e.CaptacaoId == captacaoId && e.Id == id, ct);
    }

    public async Task<Execucao?> GetByExecucaoIdAsync(Guid id, CancellationToken ct)
    {
        return await _context.Execucoes
            .Include(e => e.Captacao)
            .ThenInclude(c => c.Rubrica)
            .FirstOrDefaultAsync(e => e.Id == id, ct);
    }

    public async Task<(IEnumerable<Execucao> Items, int Total)> ListarAsync(
        Guid captacaoId, string? status, string sort, int page, int size, CancellationToken ct)
    {
        var query = _context.Execucoes
            .Include(e => e.TipoUtilizacao)
            .Where(e => e.CaptacaoId == captacaoId)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<StatusExecucao>(status, true, out var parsedStatus))
        {
            query = query.Where(e => e.Status == parsedStatus);
        }

        var total = await query.CountAsync(ct);

        if (!string.IsNullOrWhiteSpace(sort))
        {
            var descending = sort.StartsWith("-");
            var property = descending ? sort.Substring(1).ToLower() : sort.ToLower();

            query = property switch
            {
                "inicio" => descending ? query.OrderByDescending(e => e.Inicio) : query.OrderBy(e => e.Inicio),
                "fim" => descending ? query.OrderByDescending(e => e.Fim) : query.OrderBy(e => e.Fim),
                "obratitulo" => descending ? query.OrderByDescending(e => e.ObraTitulo) : query.OrderBy(e => e.ObraTitulo),
                _ => descending ? query.OrderByDescending(e => e.CriadoEm) : query.OrderBy(e => e.CriadoEm)
            };
        }
        else
        {
            query = query.OrderByDescending(e => e.CriadoEm);
        }

        var items = await query
            .Skip((page - 1) * size)
            .Take(size)
            .ToListAsync(ct);

        return (items, total);
    }

    public Task<int> ContarPorCaptacaoAsync(Guid captacaoId, CancellationToken ct)
        => _context.Execucoes.CountAsync(e => e.CaptacaoId == captacaoId, ct);

    public Task<int> ContarIdentificadasAsync(Guid captacaoId, CancellationToken ct)
        => _context.Execucoes.CountAsync(e => e.CaptacaoId == captacaoId && e.Status == StatusExecucao.Identificada, ct);

    public Task<int> ContarPendentesAsync(Guid captacaoId, CancellationToken ct)
        => _context.Execucoes.CountAsync(e => e.CaptacaoId == captacaoId && e.Status == StatusExecucao.Pendente, ct);

    public async Task<(IEnumerable<Execucao> Items, int Total)> ListarPendentesAsync(Guid? captacaoId, Guid? rubricaId, DateOnly? periodoInicio, DateOnly? periodoFim, string? q, string sort, int page, int size, CancellationToken ct)
    {
        var query = _context.Execucoes
            .Include(e => e.TipoUtilizacao)
            .Include(e => e.Captacao)
            .ThenInclude(c => c.Rubrica)
            .Where(e => e.Status == StatusExecucao.Pendente)
            .AsNoTracking();

        if (captacaoId.HasValue) query = query.Where(e => e.CaptacaoId == captacaoId.Value);
        if (rubricaId.HasValue) query = query.Where(e => e.Captacao.RubricaId == rubricaId.Value);
        if (periodoInicio.HasValue) query = query.Where(e => e.Captacao.Periodo >= periodoInicio.Value);
        if (periodoFim.HasValue) query = query.Where(e => e.Captacao.Periodo <= periodoFim.Value);
        
        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(e => e.ObraTitulo.ToLower().Contains(q.ToLower()) || 
                                     (e.FonogramaIsrc != null && e.FonogramaIsrc.ToLower().Contains(q.ToLower())) || 
                                     (e.ObraIswc != null && e.ObraIswc.ToLower().Contains(q.ToLower())));

        var total = await query.CountAsync(ct);

        if (!string.IsNullOrWhiteSpace(sort))
        {
            var descending = sort.StartsWith("-");
            var property = descending ? sort.Substring(1).ToLower() : sort.ToLower();

            query = property switch
            {
                "obratitulo" => descending ? query.OrderByDescending(e => e.ObraTitulo) : query.OrderBy(e => e.ObraTitulo),
                "isrc" => descending ? query.OrderByDescending(e => e.FonogramaIsrc) : query.OrderBy(e => e.FonogramaIsrc),
                "iswc" => descending ? query.OrderByDescending(e => e.ObraIswc) : query.OrderBy(e => e.ObraIswc),
                _ => descending ? query.OrderByDescending(e => e.CriadoEm) : query.OrderBy(e => e.CriadoEm)
            };
        }
        else
        {
            query = query.OrderByDescending(e => e.CriadoEm);
        }

        var items = await query.Skip((page - 1) * size).Take(size).ToListAsync(ct);
        return (items, total);
    }

    public async Task<(IEnumerable<Identificacao.Domain.Models.ImpactoPendenteModel> Items, int Total)> ListarImpactoPendentesAsync(Guid? captacaoId, Guid? rubricaId, DateOnly? periodoInicio, DateOnly? periodoFim, string? q, string sort, int page, int size, CancellationToken ct)
    {
        var query = _context.Execucoes
            .Where(e => e.Status == StatusExecucao.Pendente)
            .AsNoTracking();

        if (captacaoId.HasValue) query = query.Where(e => e.CaptacaoId == captacaoId.Value);
        if (rubricaId.HasValue) query = query.Where(e => e.Captacao.RubricaId == rubricaId.Value);
        if (periodoInicio.HasValue) query = query.Where(e => e.Captacao.Periodo >= periodoInicio.Value);
        if (periodoFim.HasValue) query = query.Where(e => e.Captacao.Periodo <= periodoFim.Value);
        
        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(e => e.ObraTitulo.ToLower().Contains(q.ToLower()) || 
                                     (e.FonogramaIsrc != null && e.FonogramaIsrc.ToLower().Contains(q.ToLower())) || 
                                     (e.ObraIswc != null && e.ObraIswc.ToLower().Contains(q.ToLower())));

        // Para contornar limitações do InMemoryProvider e traduções complexas de GroupBy com Distinct Count
        // fazemos a projeção dos campos base e depois agrupamentos em memória.
        var projection = await query.Select(e => new {
            e.FonogramaIsrc,
            e.ObraIswc,
            e.ObraTitulo,
            e.CaptacaoId
        }).ToListAsync(ct);

        var groupByQuery = projection.GroupBy(e => new {
            Identificador = e.FonogramaIsrc ?? e.ObraIswc ?? "desconhecido",
            Tipo = e.FonogramaIsrc != null ? "isrc" : (e.ObraIswc != null ? "iswc" : "desconhecido")
        });

        var total = groupByQuery.Count();

        var selectQuery = groupByQuery.Select(g => new Identificacao.Domain.Models.ImpactoPendenteModel(
            g.Key.Identificador,
            g.Key.Tipo,
            g.Max(e => e.ObraTitulo),
            g.Count(),
            g.Select(e => e.CaptacaoId).Distinct().Count()
        ));

        if (!string.IsNullOrWhiteSpace(sort))
        {
            var descending = sort.StartsWith("-");
            var property = descending ? sort.Substring(1).ToLower() : sort.ToLower();

            selectQuery = property switch
            {
                "quantidade" => descending ? selectQuery.OrderByDescending(x => x.QuantidadeExecucoes) : selectQuery.OrderBy(x => x.QuantidadeExecucoes),
                "captacoes" => descending ? selectQuery.OrderByDescending(x => x.CaptacoesAfetadas) : selectQuery.OrderBy(x => x.CaptacoesAfetadas),
                _ => descending ? selectQuery.OrderByDescending(x => x.Identificador) : selectQuery.OrderBy(x => x.Identificador)
            };
        }
        else
        {
            selectQuery = selectQuery.OrderByDescending(x => x.QuantidadeExecucoes);
        }

        var items = selectQuery.Skip((page - 1) * size).Take(size).ToList();
        return (items, total);
    }

    public async Task<IEnumerable<Execucao>> ListarPendentesPorIdentificadorAsync(string identificador, string tipo, CancellationToken ct)
    {
        var query = _context.Execucoes.Where(e => e.Status == StatusExecucao.Pendente);
        
        if (tipo.ToLower() == "isrc")
            query = query.Where(e => e.FonogramaIsrc == identificador);
        else if (tipo.ToLower() == "iswc")
            query = query.Where(e => e.ObraIswc == identificador);
        else
            return new List<Execucao>();

        return await query.ToListAsync(ct);
    }

    public async Task<IEnumerable<Execucao>> ListarPendentesComObraIdAsync(CancellationToken ct)
    {
        return await _context.Execucoes
            .Where(e => e.Status == StatusExecucao.Pendente && e.ObraId != Guid.Empty)
            .ToListAsync(ct);
    }

    public Task<int> ContarSemTipoUtilizacaoAsync(Guid captacaoId, CancellationToken ct)
        => _context.Execucoes.CountAsync(e =>
            e.CaptacaoId == captacaoId && e.TipoUtilizacaoId == null, ct);

    public Task<int> ContarSemHorarioAsync(Guid captacaoId, CancellationToken ct)
        => _context.Execucoes.CountAsync(e =>
            e.CaptacaoId == captacaoId && ((e.Inicio.Hour == 0 && e.Inicio.Minute == 0 && e.Inicio.Second == 0) || (e.Fim.Hour == 0 && e.Fim.Minute == 0 && e.Fim.Second == 0)), ct);

    public async Task<IEnumerable<Execucao>> ListarTodasDaCaptacaoAsync(Guid captacaoId, CancellationToken ct)
        => await _context.Execucoes
            .Where(e => e.CaptacaoId == captacaoId)
            .Include(e => e.TipoUtilizacao)
            .AsNoTracking()
            .ToListAsync(ct);

    public Task AddAsync(Execucao execucao, CancellationToken ct)
    {
        _context.Execucoes.Add(execucao);
        return Task.CompletedTask;
    }

    public Task RemoveAsync(Execucao execucao, CancellationToken ct)
    {
        _context.Execucoes.Remove(execucao);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken ct)
    {
        await _context.SaveChangesAsync(ct);
    }
}
