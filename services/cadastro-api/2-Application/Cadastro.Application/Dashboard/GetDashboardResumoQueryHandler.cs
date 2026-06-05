using Cadastro.Application.Common.CQRS;
using Cadastro.Domain.Interfaces;

namespace Cadastro.Application.Dashboard;

/// <summary>
/// Handler que agrega contagens das entidades principais do Cadastro
/// para alimentar o widget da dashboard.
/// Usa COUNTs diretos nos repositórios para máxima performance.
/// </summary>
public class GetDashboardResumoQueryHandler
    : IQueryHandler<GetDashboardResumoQuery, DashboardResumoResponse>
{
    private readonly IObraRepository _obraRepository;
    private readonly IFonogramaRepository _fonogramaRepository;
    private readonly ITitularRepository _titularRepository;
    private readonly IAssociacaoRepository _associacaoRepository;

    public GetDashboardResumoQueryHandler(
        IObraRepository obraRepository,
        IFonogramaRepository fonogramaRepository,
        ITitularRepository titularRepository,
        IAssociacaoRepository associacaoRepository)
    {
        _obraRepository = obraRepository;
        _fonogramaRepository = fonogramaRepository;
        _titularRepository = titularRepository;
        _associacaoRepository = associacaoRepository;
    }

    public async Task<DashboardResumoResponse> HandleAsync(
        GetDashboardResumoQuery query,
        CancellationToken cancellationToken)
    {
        // Executa contagens em paralelo para minimizar latência
        var obrasTask = _obraRepository.ListarAsync(
            new ObraFiltro(Page: 1, Size: 1), cancellationToken);
        var fonogramasTask = _fonogramaRepository.ListarAsync(
            new FonogramaFiltro(Page: 1, Size: 1), cancellationToken);
        var titularesTask = _titularRepository.ListarAsync(
            new TitularFiltro(Page: 1, Size: 1), cancellationToken);
        var associacoesTask = _associacaoRepository.GetAllAsync(cancellationToken);

        await Task.WhenAll(obrasTask, fonogramasTask, titularesTask, associacoesTask);

        var totalObras = (await obrasTask).Total;
        var totalFonogramas = (await fonogramasTask).Total;
        var totalTitulares = (await titularesTask).Total;
        var totalAssociacoes = (await associacoesTask).Count();

        var alertas = new List<DashboardAlerta>();

        return new DashboardResumoResponse(
            TotalObras: totalObras,
            TotalFonogramas: totalFonogramas,
            TotalTitulares: totalTitulares,
            TotalAssociacoes: totalAssociacoes,
            Alertas: alertas);
    }
}
