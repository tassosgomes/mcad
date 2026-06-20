using Identificacao.Application.Common;
using Identificacao.Domain.Filters;
using Identificacao.Domain.Interfaces;

namespace Identificacao.Application.Dashboard;

/// <summary>
/// Handler que agrega métricas do domínio de Identificação para o widget da dashboard.
/// - Taxa de Match: execuções resolvidas / total de execuções
/// - Total de Pendentes: execuções sem obra/fonograma identificado
/// - Captações Ativas: captações com status ativo
/// </summary>
public class GetDashboardResumoQueryHandler
    : IQueryHandler<GetDashboardResumoQuery, DashboardResumoResponse>
{
    private readonly ICaptacaoRepository _captacaoRepository;
    private readonly IExecucaoRepository _execucaoRepository;
    private readonly IUploadRepository _uploadRepository;

    public GetDashboardResumoQueryHandler(
        ICaptacaoRepository captacaoRepository,
        IExecucaoRepository execucaoRepository,
        IUploadRepository uploadRepository)
    {
        _captacaoRepository = captacaoRepository;
        _execucaoRepository = execucaoRepository;
        _uploadRepository = uploadRepository;
    }

    public async Task<DashboardResumoResponse> HandleAsync(
        GetDashboardResumoQuery query,
        CancellationToken cancellationToken)
    {
        // Buscar captações ativas (status = "ATIVA")
        var captacoesResult = await _captacaoRepository.ListarAsync(
            new ListarCaptacoesFiltro(Status: "ATIVA", Page: 1, Size: 1),
            cancellationToken);
        var captacoesAtivas = captacoesResult.Total;

        // Buscar pendentes globais (sem captação específica)
        var pendentesResult = await _execucaoRepository.ListarPendentesAsync(
            captacaoId: null,
            rubricaId: null,
            periodoInicio: null,
            periodoFim: null,
            q: null,
            sort: "-periodo",
            page: 1,
            size: 1,
            cancellationToken);
        var totalPendentes = pendentesResult.Total;

        // Calcular taxa de match: para cada captação ativa, somar execuções totais e identificadas
        // Aqui fazemos uma estimativa usando os totais gerais das captações ativas
        var captacoesParaCalculo = await _captacaoRepository.ListarAsync(
            new ListarCaptacoesFiltro(Status: "ATIVA", Page: 1, Size: 100),
            cancellationToken);

        long totalExecucoes = 0;
        long totalIdentificadas = 0;

        foreach (var captacao in captacoesParaCalculo.Items)
        {
            var execTotal = await _captacaoRepository.ContarExecucoesAsync(captacao.Id, cancellationToken);
            var execIdentificadas = await _execucaoRepository.ContarIdentificadasAsync(captacao.Id, cancellationToken);
            totalExecucoes += execTotal;
            totalIdentificadas += execIdentificadas;
        }

        var taxaMatch = totalExecucoes > 0
            ? Math.Round((double)totalIdentificadas / totalExecucoes * 100, 1)
            : 0.0;

        var alertas = new List<DashboardAlerta>();

        return new DashboardResumoResponse(
            TaxaMatch: taxaMatch,
            TotalPendentes: totalPendentes,
            CaptacoesAtivas: captacoesAtivas,
            UltimoLoteDescricao: null,
            Alertas: alertas);
    }
}
