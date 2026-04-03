using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Identificacao.Application.Common;
using Identificacao.Application.Common.Responses;
using Identificacao.Application.Uploads.Responses;
using Identificacao.Domain.Interfaces;

namespace Identificacao.Application.Uploads.Queries;

public class ListarErrosUploadQueryHandler : IQueryHandler<ListarErrosUploadQuery, ErroUploadListResponse>
{
    private readonly IErroUploadRepository _erroRepo;

    public ListarErrosUploadQueryHandler(IErroUploadRepository erroRepo)
    {
        _erroRepo = erroRepo;
    }

    public async Task<ErroUploadListResponse> HandleAsync(ListarErrosUploadQuery query, CancellationToken ct)
    {
        var (items, total) = await _erroRepo.ListarPorUploadAsync(query.UploadId, query.Page, query.Size, ct);

        var responseItems = items.Select(e => new ErroUploadResponse(
            e.Linha, e.Coluna, e.Mensagem
        )).ToList();

         var totalPages = (int)Math.Ceiling(total / (double)query.Size);
        return new ErroUploadListResponse(responseItems, new PaginationResponse(query.Page, query.Size, total, totalPages));
    }
}
