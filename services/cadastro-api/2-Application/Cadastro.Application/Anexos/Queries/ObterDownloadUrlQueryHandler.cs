using Cadastro.Application.Anexos.Responses;
using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Storage;
using Cadastro.Domain.Interfaces;

namespace Cadastro.Application.Anexos.Queries;

public class ObterDownloadUrlQueryHandler : IQueryHandler<ObterDownloadUrlQuery, DownloadUrlResponse>
{
    private readonly IAnexoRepository _repository;
    private readonly IStorageServiceClient _storageClient;

    public ObterDownloadUrlQueryHandler(IAnexoRepository repository, IStorageServiceClient storageClient)
    {
        _repository    = repository;
        _storageClient = storageClient;
    }

    public async Task<DownloadUrlResponse> HandleAsync(
        ObterDownloadUrlQuery query, CancellationToken cancellationToken)
    {
        var anexo = await _repository.GetAtivoByIdAsync(query.AnexoId, cancellationToken)
            ?? throw new NotFoundException("Anexo", query.AnexoId);

        if (anexo.EntidadeId != query.EntidadeId)
            throw new NotFoundException("Anexo", query.AnexoId);

        // StorageServiceClient já converte 409 (pending_scan) em ConflictException
        var result = await _storageClient.ObterUrlDownloadAsync(anexo.StorageFileId, cancellationToken);

        return new DownloadUrlResponse(result.DownloadUrl, result.ExpiresAt);
    }
}
