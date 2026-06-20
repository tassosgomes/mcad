using Identificacao.Application.Audit;
using Identificacao.Application.Common;
using Identificacao.Application.Common.Exceptions;
using Identificacao.Application.Captacoes.Responses;
using Identificacao.Application.Rubricas.Responses;
using Identificacao.Domain.Entities;
using Identificacao.Domain.Interfaces;

namespace Identificacao.Application.Captacoes.Commands;

public class CriarCaptacaoCommandHandler : ICommandHandler<CriarCaptacaoCommand, CaptacaoResponse>
{
    private readonly ICaptacaoRepository _captacaoRepo;
    private readonly IRubricaRepository _rubricaRepo;
    private readonly IIdentificacaoAuditPublisher _auditPublisher;
    private readonly IUsuarioIdentidadeRepository _usuarioRepo;

    public CriarCaptacaoCommandHandler(
        ICaptacaoRepository captacaoRepo,
        IRubricaRepository rubricaRepo,
        IIdentificacaoAuditPublisher auditPublisher,
        IUsuarioIdentidadeRepository usuarioRepo)
    {
        _captacaoRepo = captacaoRepo;
        _rubricaRepo = rubricaRepo;
        _auditPublisher = auditPublisher;
        _usuarioRepo = usuarioRepo;
    }

    public async Task<CaptacaoResponse> HandleAsync(CriarCaptacaoCommand cmd, CancellationToken ct)
    {
        var rubricaEnum = await _rubricaRepo.GetAllAsync(ct);
        var rubrica = rubricaEnum.FirstOrDefault(r => r.Id == cmd.RubricaId)
            ?? throw new NotFoundException("Rubrica não encontrada.");

        if (await _captacaoRepo.ExisteAtivaParaRubricaPeriodoAsync(cmd.RubricaId, cmd.Periodo, null, ct))
            throw new ConflictException(
                $"Já existe uma captação ativa para {rubrica.Nome} em {cmd.Periodo}",
                "CAPTACAO_DUPLICADA");

        var usuario = await _usuarioRepo.BuscarPorSubjectAsync(cmd.AnalistaSubject, ct);
        var nome = usuario?.NomeExibicao ?? cmd.AnalistaNomeClaim ?? "Desconhecido";

        var captacao = Captacao.Criar(cmd.RubricaId, cmd.Periodo, cmd.UsuarioMusicaId,
            cmd.UsuarioMusicaNome, cmd.AnalistaId, nome);

        await _captacaoRepo.AddAsync(captacao, ct);
        await _auditPublisher.PublishAsync(
            "Captacao", captacao.Id.ToString(), IdentificacaoAuditOperation.CaptacaoCreate,
            before: null, after: IdentificacaoAuditMappers.Map(captacao),
            screenId: "IDENTIFICACAO_CAPTACOES", screenName: "Captações", cancellationToken: ct);
        await _captacaoRepo.SaveChangesAsync(ct);

        var rubricaResponse = new RubricaResponse(rubrica.Id, rubrica.Sigla, rubrica.Nome, rubrica.ExigeClassificacao);

        return new CaptacaoResponse(
            captacao.Id,
            rubricaResponse,
            captacao.Periodo.ToString("yyyy-MM-dd"),
            captacao.UsuarioMusicaId,
            captacao.UsuarioMusicaNome,
            captacao.Status.ToString(),
            new AnalistaResumoResponse(captacao.AnalistaResponsavelId, captacao.AnalistaResponsavelNome),
            captacao.CriadoEm,
            captacao.AtualizadoEm
        );
    }
}
