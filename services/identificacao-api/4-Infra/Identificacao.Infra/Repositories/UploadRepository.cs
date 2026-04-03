using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Identificacao.Domain.Entities;
using Identificacao.Domain.Enums;
using Identificacao.Domain.Interfaces;
using Identificacao.Infra.Data;
using Microsoft.EntityFrameworkCore;

namespace Identificacao.Infra.Repositories;

public class UploadRepository : IUploadRepository
{
    private readonly IdentificacaoDbContext _context;

    public UploadRepository(IdentificacaoDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(Upload upload, CancellationToken ct)
    {
        await _context.Uploads.AddAsync(upload, ct);
    }

    public async Task<Upload?> GetByIdAsync(Guid captacaoId, Guid id, CancellationToken ct)
    {
        return await _context.Uploads
            .FirstOrDefaultAsync(u => u.Id == id && u.CaptacaoId == captacaoId, ct);
    }

    public async Task<(IEnumerable<Upload> Items, int Total)> ListarAsync(Guid captacaoId, int page, int size, CancellationToken ct)
    {
        var query = _context.Uploads
            .AsNoTracking()
            .Where(u => u.CaptacaoId == captacaoId);

        var total = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(u => u.CriadoEm)
            .Skip((page - 1) * size)
            .Take(size)
            .ToListAsync(ct);

        return (items, total);
    }

    public async Task<IEnumerable<Upload>> ListarPendentesAsync(CancellationToken ct)
    {
        return await _context.Uploads
            .Where(u => u.Status == StatusUpload.Processando)
            .OrderBy(u => u.CriadoEm)
            .Include(u => u.Captacao).ThenInclude(c => c.Rubrica)
            .ToListAsync(ct);
    }

    public async Task SaveChangesAsync(CancellationToken ct)
    {
        await _context.SaveChangesAsync(ct);
    }
}
