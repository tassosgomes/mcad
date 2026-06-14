using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Storage;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;
using Microsoft.Extensions.Logging;

namespace Cadastro.Application.Anexos.Commands;

public class RemoverAnexoCommandHandler : ICommandHandler<RemoverAnexoCommand, bool>
{
    private readonly IAnexoRepository _anexoRepository;
    private readonly IStorageServiceClient _storageClient;
    private readonly IOutboxEventWriter _outbox;
    private readonly ILogger<RemoverAnexoCommandHandler> _logger;

    public RemoverAnexoCommandHandler(
        IAnexoRepository anexoRepository,
        IStorageServiceClient storageClient,
        IOutboxEventWriter outbox,
        ILogger<RemoverAnexoCommandHandler> logger)
    {
        _anexoRepository = anexoRepository;
        _storageClient   = storageClient;
        _outbox          = outbox;
        _logger          = logger;
    }

    public async Task<bool> HandleAsync(RemoverAnexoCommand command, CancellationToken cancellationToken)
    {
        var anexo = await _anexoRepository.GetAtivoByIdAsync(command.AnexoId, cancellationToken)
            ?? throw new NotFoundException("Anexo", command.AnexoId);

        if (anexo.EntidadeId != command.EntidadeId)
            throw new NotFoundException("Anexo", command.AnexoId);

        try { await _storageClient.ExcluirAsync(anexo.StorageFileId, cancellationToken); }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Falha ao excluir arquivo {StorageId} do storage-service", anexo.StorageFileId);
        }

        anexo.MarcarExcluido();
        _outbox.AddEvent(EventoRemovidoType(command.EntidadeTipo), anexo.Id.ToString(), new
        {
            entidadeId = command.EntidadeId,
            anexoId    = anexo.Id,
            categoria  = anexo.Categoria.ToString(),
        });

        await _anexoRepository.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static string EventoRemovidoType(TipoEntidadeAnexo tipo) => tipo switch
    {
        TipoEntidadeAnexo.Obra      => "cadastro.obra.anexo.removido",
        TipoEntidadeAnexo.Fonograma => "cadastro.fonograma.anexo.removido",
        TipoEntidadeAnexo.Titular   => "cadastro.titular.anexo.removido",
        _ => throw new ArgumentOutOfRangeException(nameof(tipo))
    };
}
