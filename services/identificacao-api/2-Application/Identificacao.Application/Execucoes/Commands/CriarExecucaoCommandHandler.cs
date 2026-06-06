using Identificacao.Application.Audit;
using Identificacao.Application.Common;
using Identificacao.Application.Common.Exceptions;
using Identificacao.Application.Execucoes.Responses;
using Identificacao.Application.TiposUtilizacao.Responses;
using Identificacao.Domain.Entities;
using Identificacao.Domain.Enums;
using Identificacao.Domain.Exceptions;
using Identificacao.Domain.Interfaces;

namespace Identificacao.Application.Execucoes.Commands;

public class CriarExecucaoCommandHandler : ICommandHandler<CriarExecucaoCommand, ExecucaoResponse>
{
    private readonly IExecucaoRepository _execucaoRepo;
    private readonly ICaptacaoRepository _captacaoRepo;
    private readonly ITipoUtilizacaoRepository _tipoUtilizacaoRepo;
    private readonly ICadastroHttpClient _cadastroClient;
    private readonly IIdentificacaoAuditPublisher _auditPublisher;

    public CriarExecucaoCommandHandler(
        IExecucaoRepository execucaoRepo,
        ICaptacaoRepository captacaoRepo,
        ITipoUtilizacaoRepository tipoUtilizacaoRepo,
        ICadastroHttpClient cadastroClient,
        IIdentificacaoAuditPublisher auditPublisher)
    {
        _execucaoRepo = execucaoRepo;
        _captacaoRepo = captacaoRepo;
        _tipoUtilizacaoRepo = tipoUtilizacaoRepo;
        _cadastroClient = cadastroClient;
        _auditPublisher = auditPublisher;
    }

    public async Task<ExecucaoResponse> HandleAsync(CriarExecucaoCommand command, CancellationToken ct)
    {
        var captacao = await _captacaoRepo.GetByIdAsync(command.CaptacaoId, ct);
        if (captacao == null)
            throw new NotFoundException("Captação não encontrada.");

        if (captacao.AnalistaResponsavelId != command.AnalistaId)
            throw new ForbiddenException("Você não tem permissão para editar esta captação.");

        if (captacao.Status != StatusCaptacao.Aberta)
            throw new DomainException("Apenas captações ABERTAS podem receber execuções.");

        if (captacao.Rubrica.ExigeClassificacao)
        {
            if (command.TipoUtilizacaoId == null)
                throw new DomainException("Tipo de Utilização é obrigatório para esta rubrica.");
            if (string.IsNullOrWhiteSpace(command.TituloPrograma))
                throw new DomainException("Título do Programa é obrigatório para rubricas audiovisuais.");
        }

        TipoUtilizacao? tipoUtilizacao = null;
        if (command.TipoUtilizacaoId.HasValue)
        {
            tipoUtilizacao = await _tipoUtilizacaoRepo.GetByIdAsync(command.TipoUtilizacaoId.Value, ct);
            if (tipoUtilizacao == null)
                throw new NotFoundException("Tipo de Utilização não encontrado.");
        }

        var obra = await _cadastroClient.GetObraByIdAsync(command.ObraId, ct);
        if (obra == null)
            throw new NotFoundException("Obra não encontrada no Cadastro.");

        string? isrc = null;
        string? interpretes = null;

        if (command.FonogramaId.HasValue)
        {
            var fonograma = await _cadastroClient.GetFonogramaByIdAsync(command.FonogramaId.Value, ct);
            if (fonograma == null)
                throw new NotFoundException("Fonograma não encontrado no Cadastro.");
            
            if (fonograma.ObraId != obra.Id)
                throw new DomainException("O fonograma informado não pertence à obra selecionada.");

            isrc = fonograma.Isrc;
            interpretes = fonograma.Interpretes;
        }

        var statusExecucao = obra.Status == "LIBERADO" ? StatusExecucao.Identificada : StatusExecucao.Pendente;

        var execucao = Execucao.Criar(
            command.CaptacaoId,
            command.ObraId,
            command.FonogramaId,
            obra.Titulo,
            isrc,
            obra.Iswc,
            interpretes ?? "",
            command.Inicio,
            command.Fim,
            command.Quantidade,
            command.TipoUtilizacaoId,
            command.TituloPrograma,
            statusExecucao);

        await _execucaoRepo.AddAsync(execucao, ct);
        await _auditPublisher.PublishAsync(
            "Execucao", execucao.Id.ToString(), IdentificacaoAuditOperation.ExecucaoCreate,
            before: null, after: IdentificacaoAuditMappers.Map(execucao),
            screenId: "IDENTIFICACAO_EXECUCOES", screenName: "Execuções", cancellationToken: ct);
        await _execucaoRepo.SaveChangesAsync(ct);

        return new ExecucaoResponse(
            execucao.Id,
            execucao.ObraId,
            execucao.FonogramaId,
            execucao.ObraTitulo,
            execucao.FonogramaIsrc,
            execucao.ObraIswc,
            execucao.Interpretes,
            execucao.Inicio.ToString("HH:mm:ss"),
            execucao.Fim.ToString("HH:mm:ss"),
            execucao.DuracaoSegundos,
            execucao.Quantidade,
            tipoUtilizacao != null ? new TipoUtilizacaoResponse(tipoUtilizacao.Id, tipoUtilizacao.Sigla, tipoUtilizacao.Descricao, tipoUtilizacao.Peso) : null,
            execucao.TituloPrograma,
            execucao.Status.ToString()
        );
    }
}
