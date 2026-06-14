using Cadastro.Application.Anexos.Responses;
using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Storage;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;
using Microsoft.Extensions.Logging;

namespace Cadastro.Application.Anexos.Commands;

public class AnexarArquivoCommandHandler : ICommandHandler<AnexarArquivoCommand, AnexoResponse>
{
    private readonly IAnexoRepository _anexoRepository;
    private readonly IStorageServiceClient _storageClient;
    private readonly IOutboxEventWriter _outbox;
    private readonly IObraRepository _obraRepository;
    private readonly IFonogramaRepository _fonogramaRepository;
    private readonly ITitularRepository _titularRepository;
    private readonly ILogger<AnexarArquivoCommandHandler> _logger;

    public AnexarArquivoCommandHandler(
        IAnexoRepository anexoRepository,
        IStorageServiceClient storageClient,
        IOutboxEventWriter outbox,
        IObraRepository obraRepository,
        IFonogramaRepository fonogramaRepository,
        ITitularRepository titularRepository,
        ILogger<AnexarArquivoCommandHandler> logger)
    {
        _anexoRepository     = anexoRepository;
        _storageClient       = storageClient;
        _outbox              = outbox;
        _obraRepository      = obraRepository;
        _fonogramaRepository = fonogramaRepository;
        _titularRepository   = titularRepository;
        _logger              = logger;
    }

    public async Task<AnexoResponse> HandleAsync(AnexarArquivoCommand command, CancellationToken cancellationToken)
    {
        // 1. Validar compatibilidade categoria ↔ tipo de entidade
        if (!command.Categoria.CompatibilidadeComEntidade(command.EntidadeTipo))
            throw new ValidationException(new Dictionary<string, string[]>
            {
                ["categoria"] = [$"A categoria '{command.Categoria}' não é válida para {command.EntidadeTipo}."]
            });

        // 2. Validar que a entidade existe
        await ValidarEntidadeExisteAsync(command.EntidadeTipo, command.EntidadeId, cancellationToken);

        // 3. Verificar se já existe Anexo ativo para (EntidadeId, Categoria) → substituição automática
        var existente = await _anexoRepository.GetAtivoByEntidadeECategoriaAsync(
            command.EntidadeId, command.Categoria, cancellationToken);

        if (existente != null)
        {
            _logger.LogInformation(
                "Substituindo Anexo {AnexoId} (storage: {StorageId}) para entidade {EntidadeId} categoria {Categoria}",
                existente.Id, existente.StorageFileId, command.EntidadeId, command.Categoria);

            try { await _storageClient.ExcluirAsync(existente.StorageFileId, cancellationToken); }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Falha ao excluir arquivo anterior {StorageId} do storage-service", existente.StorageFileId);
            }

            existente.MarcarExcluido();
            _outbox.AddEvent(EventoRemovidoType(command.EntidadeTipo), existente.Id.ToString(), new
            {
                entidadeId = command.EntidadeId,
                anexoId    = existente.Id,
                categoria  = existente.Categoria.ToString(),
            });
        }

        // 4. Upload para o storage-service
        var storageFile = await _storageClient.UploadAsync(
            command.Conteudo, command.ContentType, command.NomeArquivo, cancellationToken);

        // 5. Criar entidade de domínio Anexo
        var anexo = Anexo.Criar(
            storageFile.Id,
            command.EntidadeTipo,
            command.EntidadeId,
            command.Categoria,
            command.NomeArquivo,
            command.ContentType,
            command.TamanhoBytes,
            command.UploadadoPor);

        await _anexoRepository.AddAsync(anexo, cancellationToken);

        // 6. Evento de adição — mesma transação via outbox
        _outbox.AddEvent(EventoAdicionadoType(command.EntidadeTipo), anexo.Id.ToString(), new
        {
            entidadeId    = command.EntidadeId,
            anexoId       = anexo.Id,
            categoria     = anexo.Categoria.ToString(),
            nomeOriginal  = anexo.NomeOriginal,
            storageFileId = anexo.StorageFileId,
            uploadadoPor  = anexo.UploadadoPor,
        });

        // 7. Persistir tudo atomicamente: soft delete anterior + novo Anexo + outbox events
        await _anexoRepository.SaveChangesAsync(cancellationToken);

        return AnexoResponse.FromAnexo(anexo);
    }

    private async Task ValidarEntidadeExisteAsync(
        TipoEntidadeAnexo tipo, Guid entidadeId, CancellationToken cancellationToken)
    {
        var existe = tipo switch
        {
            TipoEntidadeAnexo.Obra      => await _obraRepository.GetByIdAsync(entidadeId, cancellationToken) != null,
            TipoEntidadeAnexo.Fonograma => await _fonogramaRepository.GetByIdAsync(entidadeId, cancellationToken) != null,
            TipoEntidadeAnexo.Titular   => await _titularRepository.GetByIdAsync(entidadeId, cancellationToken) != null,
            _ => false
        };

        if (!existe)
            throw new NotFoundException(tipo.ToString(), entidadeId);
    }

    private static string EventoAdicionadoType(TipoEntidadeAnexo tipo) => tipo switch
    {
        TipoEntidadeAnexo.Obra      => "cadastro.obra.anexo.adicionado",
        TipoEntidadeAnexo.Fonograma => "cadastro.fonograma.anexo.adicionado",
        TipoEntidadeAnexo.Titular   => "cadastro.titular.anexo.adicionado",
        _ => throw new ArgumentOutOfRangeException(nameof(tipo))
    };

    private static string EventoRemovidoType(TipoEntidadeAnexo tipo) => tipo switch
    {
        TipoEntidadeAnexo.Obra      => "cadastro.obra.anexo.removido",
        TipoEntidadeAnexo.Fonograma => "cadastro.fonograma.anexo.removido",
        TipoEntidadeAnexo.Titular   => "cadastro.titular.anexo.removido",
        _ => throw new ArgumentOutOfRangeException(nameof(tipo))
    };
}
