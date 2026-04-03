using System.Threading;
using System.Threading.Tasks;
using Identificacao.Application.Common;
using Identificacao.Application.Common.Exceptions;
using Identificacao.Application.Uploads.Responses;
using Identificacao.Domain.Exceptions;
using Identificacao.Domain.Interfaces;

namespace Identificacao.Application.Uploads.Queries;

public class GetUploadByIdQueryHandler : IQueryHandler<GetUploadByIdQuery, UploadResponse>
{
    private readonly IUploadRepository _uploadRepo;

    public GetUploadByIdQueryHandler(IUploadRepository uploadRepo)
    {
        _uploadRepo = uploadRepo;
    }

    public async Task<UploadResponse> HandleAsync(GetUploadByIdQuery query, CancellationToken ct)
    {
        var upload = await _uploadRepo.GetByIdAsync(query.CaptacaoId, query.Id, ct)
            ?? throw new NotFoundException("Upload não encontrado.");

        return new UploadResponse(
            upload.Id, upload.CaptacaoId, upload.NomeArquivo,
            upload.Status.ToString(), upload.TotalLinhas, upload.ExecucoesCriadas,
            upload.TotalErros, upload.MensagemErro,
            upload.CriadoEm, upload.ProcessadoEm
        );
    }
}
