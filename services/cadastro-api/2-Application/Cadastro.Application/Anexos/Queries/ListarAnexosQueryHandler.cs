using Cadastro.Application.Anexos.Responses;
using Cadastro.Application.Common.CQRS;
using Cadastro.Domain.Interfaces;

namespace Cadastro.Application.Anexos.Queries;

public class ListarAnexosQueryHandler : IQueryHandler<ListarAnexosQuery, IEnumerable<AnexoResponse>>
{
    private readonly IAnexoRepository _repository;

    public ListarAnexosQueryHandler(IAnexoRepository repository)
    {
        _repository = repository;
    }

    public async Task<IEnumerable<AnexoResponse>> HandleAsync(
        ListarAnexosQuery query, CancellationToken cancellationToken)
    {
        var anexos = await _repository.ListarAtivosPorEntidadeAsync(
            query.EntidadeTipo, query.EntidadeId, cancellationToken);

        return anexos.Select(AnexoResponse.FromAnexo);
    }
}
