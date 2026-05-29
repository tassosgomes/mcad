using Cadastro.Application.Common.Authorization;
using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Exceptions;
using Cadastro.Application.Titulares;
using Cadastro.Application.Titularidades.Responses;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Interfaces;

namespace Cadastro.Application.Titularidades.Queries;

public class ListarTitularidadesQueryHandler : IQueryHandler<ListarTitularidadesQuery, TitularidadesResponse>
{
    private readonly ITitularidadeRepository _repository;
    private readonly IObraRepository _obraRepository;
    private readonly ICurrentUserPermissions _permissions;

    public ListarTitularidadesQueryHandler(
        ITitularidadeRepository repository,
        IObraRepository obraRepository,
        ICurrentUserPermissions permissions)
    {
        _repository = repository;
        _obraRepository = obraRepository;
        _permissions = permissions;
    }

    public async Task<TitularidadesResponse> HandleAsync(ListarTitularidadesQuery query, CancellationToken cancellationToken)
    {
        var obra = await _obraRepository.GetByIdAsync(query.ObraId, cancellationToken);
        if (obra == null)
            throw new NotFoundException("Obra não encontrada.", query.ObraId);

        var titularidades = await _repository.GetByObraIdAsync(query.ObraId, cancellationToken);
        
        var soma = titularidades.Sum(t => t.Percentual);
        var somaCompleta = soma == 100.0000m;

        var fullDocumentAllowed = _permissions.Has(CadastroPermissionNames.TitularVerCpfCompleto);
        var items = titularidades.Select(t => MapToItemResponse(t, fullDocumentAllowed)).ToList();

        return new TitularidadesResponse(
            query.ObraId,
            items,
            soma,
            somaCompleta
        );
    }

    internal static TitularidadeItemResponse MapToItemResponse(TitularidadeAutoral t, bool fullDocumentAllowed)
    {
        var documentoFormatado = DocumentoMasking.Apply(
            t.Titular.Documento,
            t.Titular.DocumentoFormatado,
            fullDocumentAllowed).DocumentoFormatado;

        return new TitularidadeItemResponse(
            t.Id,
            new TitularResumoResponse(
                t.TitularId,
                t.Titular.Codigo,
                t.Titular.Nome,
                t.Titular.Tipo.ToString().ToUpperInvariant(),
                documentoFormatado,
                t.Titular.Associacao?.Sigla
            ),
            t.Categoria.ToString().ToUpperInvariant(),
            t.Percentual
        );
    }
}
