using FluentValidation;
using Identificacao.Application.Audit;
using Identificacao.Application.Cancelamento.Payloads;
using Identificacao.Application.Cancelamento.Responses;
using Identificacao.Application.Common;
using Identificacao.Application.Common.Exceptions;
using Identificacao.Domain.Entities;
using Identificacao.Domain.Enums;
using Identificacao.Domain.Interfaces;

namespace Identificacao.Application.Cancelamento.Commands;

public class CancelarRolCommandHandler : ICommandHandler<CancelarRolCommand, CancelamentoResponse>
{
    private const string EventType = "identificacao.rol.cancelado";
    private const int CopyBatchSize = 100;

    private readonly ICaptacaoRepository _captacaoRepo;
    private readonly IExecucaoRepository _execucaoRepo;
    private readonly IOutboxEventWriter _outboxWriter;
    private readonly ICadastroHttpClient _cadastroHttpClient;
    private readonly IIdentificacaoAuditPublisher _auditPublisher;
    private readonly IValidator<CancelarRolCommand> _validator;

    public CancelarRolCommandHandler(
        ICaptacaoRepository captacaoRepo,
        IExecucaoRepository execucaoRepo,
        IOutboxEventWriter outboxWriter,
        ICadastroHttpClient cadastroHttpClient,
        IIdentificacaoAuditPublisher auditPublisher,
        IValidator<CancelarRolCommand> validator)
    {
        _captacaoRepo = captacaoRepo;
        _execucaoRepo = execucaoRepo;
        _outboxWriter = outboxWriter;
        _cadastroHttpClient = cadastroHttpClient;
        _auditPublisher = auditPublisher;
        _validator = validator;
    }

    public async Task<CancelamentoResponse> HandleAsync(CancelarRolCommand command, CancellationToken cancellationToken)
    {
        await _validator.ValidateAndThrowAsync(command, cancellationToken);

        var captacao = await _captacaoRepo.GetByIdAsync(command.CaptacaoId, cancellationToken)
            ?? throw new NotFoundException($"Captação {command.CaptacaoId} não encontrada.");

        if (captacao.AnalistaResponsavelId != command.AnalistaId)
            throw new ForbiddenException("Apenas o analista responsável pode cancelar esta captação.");

        var before = IdentificacaoAuditMappers.Map(captacao);

        captacao.Cancelar(command.Justificativa);

        var payload = new RolCanceladoPayload(
            captacao.Id,
            captacao.Rubrica?.Sigla ?? string.Empty,
            captacao.Periodo.ToString("yyyy-MM-dd"),
            captacao.CanceladoEm ?? DateTime.UtcNow,
            command.AnalistaId,
            command.Justificativa);

        _outboxWriter.AddEvent(EventType, captacao.Id.ToString(), payload);

        Guid? novaCaptacaoId = null;
        int? execucoesCopiadas = null;

        if (command.OpcaoRecriacao == OpcoesRecriacao.RecriarVazia
            || command.OpcaoRecriacao == OpcoesRecriacao.CopiarExecucoes)
        {
            var nova = Captacao.Criar(
                captacao.RubricaId,
                captacao.Periodo,
                captacao.UsuarioDeMusica,
                command.AnalistaId,
                command.AnalistaNome);

            await _captacaoRepo.AddAsync(nova, cancellationToken);
            novaCaptacaoId = nova.Id;

            if (command.OpcaoRecriacao == OpcoesRecriacao.CopiarExecucoes)
            {
                execucoesCopiadas = await CopiarExecucoesAsync(captacao.Id, nova.Id, cancellationToken);
            }
        }

        await _auditPublisher.PublishAsync(
            "Captacao", captacao.Id.ToString(), IdentificacaoAuditOperation.CaptacaoCancelar,
            before: before, after: IdentificacaoAuditMappers.Map(captacao),
            screenId: "IDENTIFICACAO_CAPTACOES", screenName: "Captações", cancellationToken: cancellationToken);

        await _captacaoRepo.SaveChangesAsync(cancellationToken);

        return new CancelamentoResponse(
            captacao.Id,
            captacao.Status.ToString().ToUpperInvariant(),
            command.Justificativa,
            captacao.CanceladoEm ?? DateTime.UtcNow,
            command.OpcaoRecriacao,
            novaCaptacaoId,
            execucoesCopiadas,
            EventoPublicado: true);
    }

    private async Task<int> CopiarExecucoesAsync(Guid origemId, Guid novaCaptacaoId, CancellationToken ct)
    {
        var execucoes = (await _execucaoRepo.ListarTodasDaCaptacaoAsync(origemId, ct)).ToList();
        if (execucoes.Count == 0) return 0;

        var obraStatusCache = new Dictionary<Guid, string?>();
        var fonogramaStatusCache = new Dictionary<Guid, string?>();
        var copiadas = 0;

        foreach (var batch in Chunk(execucoes, CopyBatchSize))
        {
            foreach (var origem in batch)
            {
                var status = await ResolverStatusAsync(
                    origem.ObraId, origem.FonogramaId, obraStatusCache, fonogramaStatusCache, ct);

                var copia = Execucao.Criar(
                    captacaoId: novaCaptacaoId,
                    obraId: origem.ObraId,
                    fonogramaId: origem.FonogramaId,
                    obraTitulo: origem.ObraTitulo,
                    fonogramaIsrc: origem.FonogramaIsrc,
                    obraIswc: origem.ObraIswc,
                    interpretes: origem.Interpretes,
                    inicio: origem.Inicio,
                    fim: origem.Fim,
                    quantidade: origem.Quantidade,
                    tipoUtilizacaoId: origem.TipoUtilizacaoId,
                    tituloPrograma: origem.TituloPrograma,
                    status: status);

                await _execucaoRepo.AddAsync(copia, ct);
                copiadas++;
            }
        }

        return copiadas;
    }

    private async Task<StatusExecucao> ResolverStatusAsync(
        Guid obraId,
        Guid? fonogramaId,
        Dictionary<Guid, string?> obraCache,
        Dictionary<Guid, string?> fonogramaCache,
        CancellationToken ct)
    {
        if (fonogramaId.HasValue)
        {
            if (!fonogramaCache.TryGetValue(fonogramaId.Value, out var fonStatus))
            {
                var dto = await _cadastroHttpClient.GetFonogramaByIdAsync(fonogramaId.Value, ct);
                fonStatus = dto?.Status;
                fonogramaCache[fonogramaId.Value] = fonStatus;
            }
            if (fonStatus != "LIBERADO") return StatusExecucao.Pendente;
        }

        if (!obraCache.TryGetValue(obraId, out var obraStatus))
        {
            var dto = await _cadastroHttpClient.GetObraByIdAsync(obraId, ct);
            obraStatus = dto?.Status;
            obraCache[obraId] = obraStatus;
        }

        return obraStatus == "LIBERADO" ? StatusExecucao.Identificada : StatusExecucao.Pendente;
    }

    private static IEnumerable<IReadOnlyList<T>> Chunk<T>(IList<T> source, int size)
    {
        for (var i = 0; i < source.Count; i += size)
        {
            var count = Math.Min(size, source.Count - i);
            var chunk = new List<T>(count);
            for (var j = 0; j < count; j++) chunk.Add(source[i + j]);
            yield return chunk;
        }
    }
}
