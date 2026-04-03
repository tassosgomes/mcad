using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Identificacao.Domain.Entities;

namespace Identificacao.Domain.Interfaces;

public interface IErroUploadRepository
{
    Task AddAsync(ErroUpload erro, CancellationToken ct);
    Task<(IEnumerable<ErroUpload> Items, int Total)> ListarPorUploadAsync(Guid uploadId, int page, int size, CancellationToken ct);
}
