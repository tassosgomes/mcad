using Identificacao.Application.Audit;
using Identificacao.Application.Common;
using Identificacao.Application.Common.Exceptions;
using Identificacao.Application.Captacoes.Responses;
using Identificacao.Application.Rubricas.Responses;
using Identificacao.Domain.Interfaces;

namespace Identificacao.Application.Captacoes.Commands;

public class AtualizarCaptacaoCommandHandler : ICommandHandler<AtualizarCaptacaoCommand, CaptacaoResponse>
{
    private readonly ICaptacaoRepository _captacaoRepo;
    private readonly IRubricaRepository _rubricaRepo;
    private readonly IIdentificacaoAuditPublisher _auditPublisher;

    public AtualizarCaptacaoCommandHandler(
        ICaptacaoRepository captacaoRepo,
        IRubricaRepository rubricaRepo,
        IIdentificacaoAuditPublisher auditPublisher)
    {
        _captacaoRepo = captacaoRepo;
        _rubricaRepo = rubricaRepo;
        _auditPublisher = auditPublisher;
    }

    public async Task<CaptacaoResponse> HandleAsync(AtualizarCaptacaoCommand cmd, CancellationToken ct)
    {
        var captacao = await _captacaoRepo.GetByIdAsync(cmd.Id, ct)
            ?? throw new NotFoundException("Captação não encontrada.");

        captacao.ValidarPropriedade(cmd.AnalistaId);
        captacao.ValidarAberta();

        var rubricaEnum = await _rubricaRepo.GetAllAsync(ct);
        var rubrica = rubricaEnum.FirstOrDefault(r => r.Id == cmd.RubricaId)
            ?? throw new NotFoundException("Rubrica não encontrada.");

        if (captacao.RubricaId != cmd.RubricaId)
        {
            var totalExecucoes = await _captacaoRepo.ContarExecucoesAsync(captacao.Id, ct);
            if (totalExecucoes > 0)
                throw new ConflictException("Não é possível alterar a rubrica de uma captação que já possui execuções");
        }

        if (await _captacaoRepo.ExisteAtivaParaRubricaPeriodoAsync(cmd.RubricaId, cmd.Periodo, captacao.Id, ct))
            throw new ConflictException($"Já existe uma captação ativa para {rubrica.Nome} em {cmd.Periodo}");

        var before = IdentificacaoAuditMappers.Map(captacao);
        captacao.Atualizar(cmd.RubricaId, cmd.Periodo, cmd.UsuarioDeMusica);

        await _auditPublisher.PublishAsync(
            "Captacao", captacao.Id.ToString(), IdentificacaoAuditOperation.CaptacaoUpdate,
            before: before, after: IdentificacaoAuditMappers.Map(captacao),
            screenId: "IDENTIFICACAO_CAPTACOES", screenName: "Captações", cancellationToken: ct);
        await _captacaoRepo.SaveChangesAsync(ct);

        var rubricaResponse = new RubricaResponse(rubrica.Id, rubrica.Sigla, rubrica.Nome, rubrica.ExigeClassificacao);

        return new CaptacaoResponse(
            captacao.Id,
            rubricaResponse,
            captacao.Periodo.ToString("yyyy-MM-dd"),
            captacao.UsuarioDeMusica,
            captacao.Status.ToString(),
            new AnalistaResumoResponse(captacao.AnalistaResponsavelId, captacao.AnalistaResponsavelNome),
            captacao.CriadoEm,
            captacao.AtualizadoEm
        );
    }
}
