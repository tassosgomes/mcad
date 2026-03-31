using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Fonogramas.Responses;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;
using Cadastro.Application.Common.CQRS;

namespace Cadastro.Application.Fonogramas.Queries;

public record ListarFonogramasPorObraQuery(Guid ObraId) : IQuery<IEnumerable<FonogramaResumoResponse>>;

public class ListarFonogramasPorObraHandler : IQueryHandler<ListarFonogramasPorObraQuery, IEnumerable<FonogramaResumoResponse>>
{
    private readonly IFonogramaRepository _repository;
    private readonly IObraRepository _obraRepository;

    public ListarFonogramasPorObraHandler(IFonogramaRepository repository, IObraRepository obraRepository)
    {
        _repository = repository;
        _obraRepository = obraRepository;
    }

    public async Task<IEnumerable<FonogramaResumoResponse>> HandleAsync(ListarFonogramasPorObraQuery query, CancellationToken cancellationToken)
    {
        var obra = await _obraRepository.GetByIdAsync(query.ObraId, cancellationToken);
        if (obra == null)
            throw new NotFoundException("Obra não encontrada.", query.ObraId);

        var fonogramas = await _repository.GetByObraIdAsync(query.ObraId, cancellationToken);

        return fonogramas.Select(f => {
            var fStatus = f.Status == StatusFonograma.PendenteValidacao ? "PENDENTE_VALIDACAO" :
                          f.Status == StatusFonograma.PendenteDocumentacao ? "PENDENTE_DOCUMENTACAO" :
                          f.Status.ToString().ToUpperInvariant();

            return new FonogramaResumoResponse(
                f.Id,
                f.Isrc.Formatado,
                fStatus,
                f.PaisOrigem,
                f.DataLancamento
            );
        });
    }
}
