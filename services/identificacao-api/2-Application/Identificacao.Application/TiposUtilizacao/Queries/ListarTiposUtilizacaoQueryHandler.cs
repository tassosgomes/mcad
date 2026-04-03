using Identificacao.Application.Common;
using Identificacao.Application.TiposUtilizacao.Responses;
using Identificacao.Domain.Interfaces;

namespace Identificacao.Application.TiposUtilizacao.Queries;

public class ListarTiposUtilizacaoQueryHandler : IQueryHandler<ListarTiposUtilizacaoQuery, IEnumerable<TipoUtilizacaoResponse>>
{
    private readonly ITipoUtilizacaoRepository _repository;

    public ListarTiposUtilizacaoQueryHandler(ITipoUtilizacaoRepository repository)
    {
        _repository = repository;
    }

    public async Task<IEnumerable<TipoUtilizacaoResponse>> HandleAsync(ListarTiposUtilizacaoQuery query, CancellationToken ct)
    {
        var tipos = await _repository.ListarAsync(ct);
        return tipos.Select(t => new TipoUtilizacaoResponse(t.Id, t.Sigla, t.Descricao, t.Peso));
    }
}
