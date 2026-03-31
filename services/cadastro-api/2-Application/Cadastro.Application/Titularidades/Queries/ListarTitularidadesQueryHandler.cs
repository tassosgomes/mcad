using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Titularidades.Responses;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Interfaces;

namespace Cadastro.Application.Titularidades.Queries;

public class ListarTitularidadesQueryHandler : IQueryHandler<ListarTitularidadesQuery, TitularidadesResponse>
{
    private readonly ITitularidadeRepository _repository;
    private readonly IObraRepository _obraRepository;

    public ListarTitularidadesQueryHandler(ITitularidadeRepository repository, IObraRepository obraRepository)
    {
        _repository = repository;
        _obraRepository = obraRepository;
    }

    public async Task<TitularidadesResponse> HandleAsync(ListarTitularidadesQuery query, CancellationToken cancellationToken)
    {
        var obra = await _obraRepository.GetByIdAsync(query.ObraId, cancellationToken);
        if (obra == null)
            throw new NotFoundException("Obra não encontrada.", query.ObraId);

        var titularidades = await _repository.GetByObraIdAsync(query.ObraId, cancellationToken);
        
        var soma = titularidades.Sum(t => t.Percentual);
        var somaCompleta = soma == 100.0000m;

        var items = titularidades.Select(MapToItemResponse).ToList();

        return new TitularidadesResponse(
            query.ObraId,
            items,
            soma,
            somaCompleta
        );
    }

    internal static TitularidadeItemResponse MapToItemResponse(TitularidadeAutoral t)
    {
        return new TitularidadeItemResponse(
            t.Id,
            new TitularResumoResponse(
                t.TitularId,
                t.Titular.Nome,
                t.Titular.Tipo.ToString().ToUpperInvariant(),
                t.Titular.DocumentoFormatado,
                t.Titular.Associacao?.Sigla
            ),
            t.Categoria.ToString().ToUpperInvariant(),
            t.Percentual
        );
    }
}
