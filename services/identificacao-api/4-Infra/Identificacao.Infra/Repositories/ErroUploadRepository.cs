using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Identificacao.Domain.Entities;
using Identificacao.Domain.Interfaces;
using Identificacao.Infra.Data;
using Microsoft.EntityFrameworkCore;

namespace Identificacao.Infra.Repositories;

public class ErroUploadRepository : IErroUploadRepository
{
    private readonly IdentificacaoDbContext _context;

    public ErroUploadRepository(IdentificacaoDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(ErroUpload erro, CancellationToken ct)
    {
        await _context.ErrosUpload.AddAsync(erro, ct);
    }

    public async Task<(IEnumerable<ErroUpload> Items, int Total)> ListarPorUploadAsync(Guid uploadId, int page, int size, CancellationToken ct)
    {
        var query = _context.ErrosUpload
            .AsNoTracking()
            .Where(e => e.UploadId == uploadId);

        var total = await query.CountAsync(ct);

        var items = await query
            .OrderBy(e => e.Linha)
            .Skip((page - 1) * size)
            .Take(size)
            .ToListAsync(ct);

        return (items, total);
    }
}
