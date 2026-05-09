using Identificacao.Application.Audit;
using Identificacao.Application.Common;
using Identificacao.Application.Common.Exceptions;
using Identificacao.Domain.Interfaces;

namespace Identificacao.Application.Captacoes.Commands;

public class ExcluirCaptacaoCommandHandler : ICommandHandler<ExcluirCaptacaoCommand, Unit>
{
    private readonly ICaptacaoRepository _captacaoRepo;
    private readonly IIdentificacaoAuditPublisher _auditPublisher;

    public ExcluirCaptacaoCommandHandler(
        ICaptacaoRepository captacaoRepo,
        IIdentificacaoAuditPublisher auditPublisher)
    {
        _captacaoRepo = captacaoRepo;
        _auditPublisher = auditPublisher;
    }

    public async Task<Unit> HandleAsync(ExcluirCaptacaoCommand cmd, CancellationToken ct)
    {
        var captacao = await _captacaoRepo.GetByIdAsync(cmd.Id, ct)
            ?? throw new NotFoundException("Captação não encontrada.");

        captacao.ValidarPropriedade(cmd.AnalistaId);
        captacao.ValidarAberta();

        var before = IdentificacaoAuditMappers.Map(captacao);

        await _captacaoRepo.RemoveAsync(captacao, ct);
        await _auditPublisher.PublishAsync(
            "Captacao", captacao.Id.ToString(), IdentificacaoAuditOperation.CaptacaoDelete,
            before: before, after: null,
            screenId: "IDENTIFICACAO_CAPTACOES", screenName: "Captações", cancellationToken: ct);
        await _captacaoRepo.SaveChangesAsync(ct);

        return Unit.Value;
    }
}
