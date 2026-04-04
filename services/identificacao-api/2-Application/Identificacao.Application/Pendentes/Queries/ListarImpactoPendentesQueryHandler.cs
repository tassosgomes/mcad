using Identificacao.Application.Common;
using Identificacao.Application.Common.Responses;
using Identificacao.Application.Pendentes.Responses;
using Identificacao.Domain.Interfaces;

namespace Identificacao.Application.Pendentes.Queries;

public class ListarImpactoPendentesQueryHandler : IQueryHandler<ListarImpactoPendentesQuery, ImpactoPendenteListResponse>
{
    private readonly IExecucaoRepository _repository;

    public ListarImpactoPendentesQueryHandler(IExecucaoRepository repository)
    {
        _repository = repository;
    }

    public async Task<ImpactoPendenteListResponse> HandleAsync(ListarImpactoPendentesQuery query, CancellationToken cancellationToken)
    {
        // 1. Buscar agrupamento
        var result = await _repository.ListarImpactoPendentesAsync(
            query.CaptacaoId, query.RubricaId, query.PeriodoInicio, query.PeriodoFim,
            query.Q, query.Sort ?? "", query.Page ?? 1, query.Size ?? 10, cancellationToken);
            
        var totalPages = (int)Math.Ceiling((double)result.Total / (query.Size ?? 10));

        var responseItems = new List<ImpactoPendenteResponse>();

        // 2. Para cada grupo, buscar captações detalhadas
        foreach (var grupo in result.Items)
        {
            var execucoes = await _repository.ListarPendentesPorIdentificadorAsync(grupo.Identificador, grupo.Tipo, cancellationToken);
            
            var captacoesDetalhe = execucoes
                .GroupBy(e => e.CaptacaoId)
                .Select(g => new CaptacaoImpactoDto(
                    g.Key, 
                    g.First().Captacao?.Rubrica?.Nome ?? "N/A", 
                    g.First().Captacao?.Periodo.ToString("yyyy-MM-dd") ?? "", 
                    g.Count()))
                .ToList();

            responseItems.Add(new ImpactoPendenteResponse(
                grupo.Identificador,
                grupo.Tipo,
                grupo.ObraTitulo,
                grupo.QuantidadeExecucoes,
                grupo.CaptacoesAfetadas,
                captacoesDetalhe
            ));
        }

        return new ImpactoPendenteListResponse(
            responseItems,
            new PaginationResponse(query.Page ?? 1, query.Size ?? 10, result.Total, totalPages)
        );
    }
}
