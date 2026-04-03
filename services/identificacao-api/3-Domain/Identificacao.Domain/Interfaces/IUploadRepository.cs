using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Identificacao.Domain.Entities;

namespace Identificacao.Domain.Interfaces;

public interface IUploadRepository
{
    Task<Upload?> GetByIdAsync(Guid captacaoId, Guid id, CancellationToken ct);
    Task<(IEnumerable<Upload> Items, int Total)> ListarAsync(Guid captacaoId, int page, int size, CancellationToken ct);
    Task<IEnumerable<Upload>> ListarPendentesAsync(CancellationToken ct);
    Task AddAsync(Upload upload, CancellationToken ct);
    Task SaveChangesAsync(CancellationToken ct);
}
