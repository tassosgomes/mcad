using System;
using System.Threading;
using System.Threading.Tasks;
using FluentValidation;
using Identificacao.Application.Audit;
using Identificacao.Application.Common;
using Identificacao.Application.Common.Exceptions;
using Identificacao.Application.Uploads.Responses;
using Identificacao.Domain.Entities;
using Identificacao.Domain.Exceptions;
using Identificacao.Domain.Interfaces;

namespace Identificacao.Application.Uploads.Commands;

public class CriarUploadCommandHandler : ICommandHandler<CriarUploadCommand, UploadResponse>
{
    private readonly ICaptacaoRepository _captacaoRepo;
    private readonly IUploadRepository _uploadRepo;
    private readonly IMinioService _minioService;
    private readonly IIdentificacaoAuditPublisher _auditPublisher;

    public CriarUploadCommandHandler(
        ICaptacaoRepository captacaoRepo,
        IUploadRepository uploadRepo,
        IMinioService minioService,
        IIdentificacaoAuditPublisher auditPublisher)
    {
        _captacaoRepo = captacaoRepo;
        _uploadRepo = uploadRepo;
        _minioService = minioService;
        _auditPublisher = auditPublisher;
    }

    public async Task<UploadResponse> HandleAsync(CriarUploadCommand cmd, CancellationToken ct)
    {
        if (!cmd.NomeArquivo.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
            throw new ValidationException(new[] { new FluentValidation.Results.ValidationFailure("NomeArquivo", "Formato inválido. Apenas arquivos .csv são aceitos") });

        if (cmd.ArquivoStream.Length == 0)
            throw new ValidationException(new[] { new FluentValidation.Results.ValidationFailure("ArquivoStream", "Arquivo vazio ou sem cabeçalho válido") });

        var captacao = await _captacaoRepo.GetByIdAsync(cmd.CaptacaoId, ct)
            ?? throw new NotFoundException("Captação não encontrada.");
            
        captacao.ValidarAberta();
        captacao.ValidarPropriedade(cmd.AnalistaId);

        var upload = Upload.Criar(cmd.CaptacaoId, cmd.NomeArquivo, "", cmd.AnalistaId);
        
        var minioKey = $"uploads/{cmd.CaptacaoId}/{upload.Id}/{cmd.NomeArquivo}";
        await _minioService.UploadAsync(minioKey, cmd.ArquivoStream, "text/csv", ct);

        typeof(Upload).GetProperty("MinioKey")?.SetValue(upload, minioKey);

        await _uploadRepo.AddAsync(upload, ct);
        await _auditPublisher.PublishAsync(
            "Upload", upload.Id.ToString(), IdentificacaoAuditOperation.UploadCreate,
            before: null, after: IdentificacaoAuditMappers.Map(upload),
            screenId: "IDENTIFICACAO_UPLOADS", screenName: "Uploads CSV", cancellationToken: ct);
        await _uploadRepo.SaveChangesAsync(ct);

        return new UploadResponse(
            upload.Id, upload.CaptacaoId, upload.NomeArquivo,
            upload.Status.ToString(), upload.TotalLinhas, upload.ExecucoesCriadas,
            upload.TotalErros, upload.MensagemErro,
            upload.CriadoEm, upload.ProcessadoEm
        );
    }
}
