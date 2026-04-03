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
            .Include(e => e.TipoUtilizacao)
            .FirstOrDefaultAsync(e => e.CaptacaoId == captacaoId && e.Id == id, ct);
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
