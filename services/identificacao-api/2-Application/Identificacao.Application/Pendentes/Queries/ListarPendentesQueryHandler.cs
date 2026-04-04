using Identificacao.Application.Common;
using Identificacao.Application.Common.Responses;
using Identificacao.Application.Pendentes.Responses;
using Identificacao.Domain.Interfaces;

namespace Identificacao.Application.Pendentes.Queries;

public class ListarPendentesQueryHandler : IQueryHandler<ListarPendentesQuery, ExecucaoPendenteListResponse>
{
    private readonly IExecucaoRepository _repository;

    public ListarPendentesQueryHandler(IExecucaoRepository repository)
    {
        _repository = repository;
    }

    public async Task<ExecucaoPendenteListResponse> HandleAsync(ListarPendentesQuery query, CancellationToken cancellationToken)
    {
        var result = await _repository.ListarPendentesAsync(
            query.CaptacaoId, query.RubricaId, query.PeriodoInicio, query.PeriodoFim,
            query.Q, query.Sort ?? "", query.Page ?? 1, query.Size ?? 10, cancellationToken);
            
        var totalPages = (int)Math.Ceiling((double)result.Total / (query.Size ?? 10));

        var items = result.Items.Select(e => new ExecucaoPendenteResponse(
            e.Id, e.CaptacaoId,
            e.Captacao.Rubrica?.Nome ?? "N/A",
            e.Captacao.Periodo.ToString("yyyy-MM-dd"),
            e.Captacao.Status.ToString(),
            e.Captacao.AnalistaResponsavelNome,
            e.ObraId == Guid.Empty ? null : e.ObraId,
            e.FonogramaId,
            e.ObraTitulo,
            e.FonogramaIsrc,
            e.ObraIswc,
            e.Interpretes,
            e.Inicio.ToString(@"HH\:mm\:ss"),
            e.Fim.ToString(@"HH\:mm\:ss"),
            e.Quantidade,
            e.Status.ToString(),
            e.CriadoEm
        ));

        return new ExecucaoPendenteListResponse(
            items,
            new PaginationResponse(query.Page ?? 1, query.Size ?? 10, result.Total, totalPages)
        );
    }
}
