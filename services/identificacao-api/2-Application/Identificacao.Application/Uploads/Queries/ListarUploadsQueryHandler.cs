using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Identificacao.Application.Common;
using Identificacao.Application.Common.Responses;
using Identificacao.Application.Uploads.Responses;
using Identificacao.Domain.Interfaces;

namespace Identificacao.Application.Uploads.Queries;

public class ListarUploadsQueryHandler : IQueryHandler<ListarUploadsQuery, UploadListResponse>
{
    private readonly IUploadRepository _uploadRepo;

    public ListarUploadsQueryHandler(IUploadRepository uploadRepo)
    {
        _uploadRepo = uploadRepo;
    }

    public async Task<UploadListResponse> HandleAsync(ListarUploadsQuery query, CancellationToken ct)
    {
        var (items, total) = await _uploadRepo.ListarAsync(query.CaptacaoId, query.Page, query.Size, ct);

        var responseItems = items.Select(u => new UploadResponse(
            u.Id, u.CaptacaoId, u.NomeArquivo,
            u.Status.ToString(), u.TotalLinhas, u.ExecucoesCriadas,
            u.TotalErros, u.MensagemErro,
            u.CriadoEm, u.ProcessadoEm
        )).ToList();

        var totalPages = (int)Math.Ceiling(total / (double)query.Size);
        return new UploadListResponse(responseItems, new PaginationResponse(query.Page, query.Size, total, totalPages));
    }
}
