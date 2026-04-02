using Identificacao.Application.Common;
using Identificacao.Application.Rubricas.Responses;
using Identificacao.Domain.Interfaces;

namespace Identificacao.Application.Rubricas.Queries;

public class ListarRubricasQueryHandler : IQueryHandler<ListarRubricasQuery, IEnumerable<RubricaResponse>>
{
    private readonly IRubricaRepository _repository;

    public ListarRubricasQueryHandler(IRubricaRepository repository)
    {
        _repository = repository;
    }

    public async Task<IEnumerable<RubricaResponse>> HandleAsync(ListarRubricasQuery query, CancellationToken cancellationToken)
    {
        var rubricas = await _repository.GetAllAsync(cancellationToken);
        
        return rubricas.Select(r => new RubricaResponse(r.Id, r.Sigla, r.Nome, r.ExigeClassificacao));
    }
}
