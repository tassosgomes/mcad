using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Status.Responses;
using Cadastro.Domain.Interfaces;

namespace Cadastro.Application.Status.Queries;

public record HistoricoBloqueiosQuery(string EntidadeTipo, Guid EntidadeId) : IQuery<IEnumerable<HistoricoBloqueioResponse>>;

public class HistoricoBloqueiosQueryHandler : IQueryHandler<HistoricoBloqueiosQuery, IEnumerable<HistoricoBloqueioResponse>>
{
    private readonly IHistoricoBloqueioRepository _historicoRepository;

    public HistoricoBloqueiosQueryHandler(IHistoricoBloqueioRepository historicoRepository)
    {
        _historicoRepository = historicoRepository;
    }

    public async Task<IEnumerable<HistoricoBloqueioResponse>> HandleAsync(HistoricoBloqueiosQuery query, CancellationToken cancellationToken)
    {
        var historico = await _historicoRepository.GetByEntidadeAsync(query.EntidadeTipo, query.EntidadeId, cancellationToken);
        
        return historico.Select(h => new HistoricoBloqueioResponse(
            h.Id,
            h.Acao,
            h.Justificativa,
            h.DataHora
        )).ToList();
    }
}
