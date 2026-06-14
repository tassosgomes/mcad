using Cadastro.Application.Anexos.Responses;
using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Storage;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;
using Microsoft.Extensions.Logging;

namespace Cadastro.Application.Anexos.Queries;

public class ObterMetadadosAnexoQueryHandler : IQueryHandler<ObterMetadadosAnexoQuery, AnexoResponse>
{
    private readonly IAnexoRepository _repository;
    private readonly IStorageServiceClient _storageClient;
    private readonly ILogger<ObterMetadadosAnexoQueryHandler> _logger;

    public ObterMetadadosAnexoQueryHandler(
        IAnexoRepository repository,
        IStorageServiceClient storageClient,
        ILogger<ObterMetadadosAnexoQueryHandler> logger)
    {
        _repository    = repository;
        _storageClient = storageClient;
        _logger        = logger;
    }

    public async Task<AnexoResponse> HandleAsync(
        ObterMetadadosAnexoQuery query, CancellationToken cancellationToken)
    {
        var anexo = await _repository.GetAtivoByIdAsync(query.AnexoId, cancellationToken)
            ?? throw new NotFoundException("Anexo", query.AnexoId);

        if (anexo.EntidadeId != query.EntidadeId)
            throw new NotFoundException("Anexo", query.AnexoId);

        // Sync lazy: se ainda pendente, consulta storage-service e persiste o resultado
        if (anexo.StatusScan == StatusAnexo.PendenteScan)
        {
            try
            {
                var storageFile = await _storageClient.ObterMetadadosAsync(anexo.StorageFileId, cancellationToken);
                var novoStatus = storageFile.Status switch
                {
                    "clean"    => StatusAnexo.Limpo,
                    "infected" => StatusAnexo.Infectado,
                    _          => StatusAnexo.PendenteScan
                };

                if (novoStatus != StatusAnexo.PendenteScan)
                {
                    anexo.AtualizarStatusScan(novoStatus);
                    _repository.Update(anexo);
                    await _repository.SaveChangesAsync(cancellationToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Falha ao sincronizar status scan do Anexo {AnexoId}", anexo.Id);
            }
        }

        return AnexoResponse.FromAnexo(anexo);
    }
}
