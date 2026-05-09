using Identificacao.Application.Audit;
using Identificacao.Application.Common;
using Identificacao.Application.Fechamento.Responses;
using Identificacao.Application.Fechamento.Payloads;
using Identificacao.Application.Fechamento.Queries;
using Identificacao.Domain.Entities;
using Identificacao.Domain.Interfaces;
using Identificacao.Domain.Exceptions;
using Identificacao.Application.Common.Exceptions;

namespace Identificacao.Application.Fechamento.Commands;

public class FecharRolCommandHandler : ICommandHandler<FecharRolCommand, FechamentoResponse>
{
    private readonly ICaptacaoRepository _captacaoRepo;
    private readonly IExecucaoRepository _execucaoRepo;
    private readonly IOutboxEventWriter _outboxWriter;
    private readonly IQueryHandler<ValidarPreRequisitosQuery, PreRequisitosResponse> _preRequisitosHandler;
    private readonly IIdentificacaoAuditPublisher _auditPublisher;

    public FecharRolCommandHandler(
        ICaptacaoRepository captacaoRepo,
        IExecucaoRepository execucaoRepo,
        IOutboxEventWriter outboxWriter,
        IQueryHandler<ValidarPreRequisitosQuery, PreRequisitosResponse> preRequisitosHandler,
        IIdentificacaoAuditPublisher auditPublisher)
    {
        _captacaoRepo = captacaoRepo;
        _execucaoRepo = execucaoRepo;
        _outboxWriter = outboxWriter;
        _preRequisitosHandler = preRequisitosHandler;
        _auditPublisher = auditPublisher;
    }

    public async Task<FechamentoResponse> HandleAsync(FecharRolCommand cmd, CancellationToken ct)
    {
        var captacao = await _captacaoRepo.GetByIdAsync(cmd.CaptacaoId, ct)
            ?? throw new NotFoundException($"Captação {cmd.CaptacaoId} não encontrada.");

        captacao.ValidarAberta();
        captacao.ValidarPropriedade(cmd.AnalistaId);

        var preRequisitos = await _preRequisitosHandler.HandleAsync(
            new ValidarPreRequisitosQuery(cmd.CaptacaoId), ct);

        if (!preRequisitos.TodosAtendidos)
        {
            var primeiroFalho = preRequisitos.Itens.First(i => !i.Atendido);
            throw new PreRequisitosException(primeiroFalho.Detalhe ?? "Pré-requisitos não atendidos",
                primeiroFalho.Id, preRequisitos.Itens);
        }

        var before = IdentificacaoAuditMappers.Map(captacao);
        captacao.Fechar();

        var execucoes = await _execucaoRepo.ListarTodasDaCaptacaoAsync(cmd.CaptacaoId, ct);
        var payload = MontarPayload(captacao, execucoes);

        // outbox
        _outboxWriter.AddEvent("identificacao.rol.fechado", cmd.CaptacaoId.ToString(), payload);

        await _auditPublisher.PublishAsync(
            "Captacao", captacao.Id.ToString(), IdentificacaoAuditOperation.CaptacaoFechar,
            before: before, after: IdentificacaoAuditMappers.Map(captacao),
            screenId: "IDENTIFICACAO_CAPTACOES", screenName: "Captações", cancellationToken: ct);
        await _captacaoRepo.SaveChangesAsync(ct);

        return new FechamentoResponse(cmd.CaptacaoId, "FECHADA", DateTime.UtcNow,
            execucoes.Count(), true);
    }

    private RolFechadoPayload MontarPayload(Captacao captacao, IEnumerable<Execucao> execucoes)
    {
        var exige = captacao.Rubrica!.ExigeClassificacao;
        
        var exePayloads = execucoes.Select(e => new ExecucaoRolPayload(
            e.ObraId, e.FonogramaId, e.Quantidade,
            exige ? e.TipoUtilizacao?.Sigla : null,
            exige ? e.TipoUtilizacao?.Peso : null,
            exige && e.Inicio != default ? e.Inicio.ToString("HH:mm:ss") : null,
            exige && e.Fim != default ? e.Fim.ToString("HH:mm:ss") : null,
            exige ? e.DuracaoSegundos : null
        )).ToList();

        return new RolFechadoPayload(
            captacao.Id, captacao.Rubrica.Sigla, captacao.Periodo.ToString("yyyy-MM-dd"),
            DateTime.UtcNow, captacao.AnalistaResponsavelId, exePayloads);
    }
}
