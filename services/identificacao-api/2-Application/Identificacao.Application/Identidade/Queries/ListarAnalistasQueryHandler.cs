using Identificacao.Application.Captacoes.Responses;
using Identificacao.Application.Common;
using Identificacao.Domain.Identidade;
using Identificacao.Domain.Interfaces;

namespace Identificacao.Application.Identidade.Queries;

public class ListarAnalistasQueryHandler : IQueryHandler<ListarAnalistasQuery, IEnumerable<AnalistaResumoResponse>>
{
    private readonly IUsuarioIdentidadeRepository _repository;

    public ListarAnalistasQueryHandler(IUsuarioIdentidadeRepository repository)
    {
        _repository = repository;
    }

    public async Task<IEnumerable<AnalistaResumoResponse>> HandleAsync(ListarAnalistasQuery query, CancellationToken cancellationToken)
    {
        var ativos = await _repository.ListarAtivosAsync(cancellationToken);

        return ativos
            .Select(u => new AnalistaResumoResponse(
                AnalistaIdentificador.FromSubject(u.LogtoUserId),
                u.NomeExibicao))
            .OrderBy(a => a.Nome, StringComparer.OrdinalIgnoreCase);
    }
}
