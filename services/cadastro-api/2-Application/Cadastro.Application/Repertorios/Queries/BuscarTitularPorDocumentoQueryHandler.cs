using System.Text.RegularExpressions;
using Cadastro.Application.Common.CQRS;
using Cadastro.Domain.Interfaces;

namespace Cadastro.Application.Repertorios.Queries;

public partial class BuscarTitularPorDocumentoQueryHandler : IQueryHandler<BuscarTitularPorDocumentoQuery, TitularResumoResponse?>
{
    private readonly ITitularRepository _repository;

    public BuscarTitularPorDocumentoQueryHandler(ITitularRepository repository)
    {
        _repository = repository;
    }

    public async Task<TitularResumoResponse?> HandleAsync(BuscarTitularPorDocumentoQuery query, CancellationToken cancellationToken)
    {
        var documentoNormalizado = NormalizarDocumento(query.Documento);

        if (string.IsNullOrWhiteSpace(documentoNormalizado))
            return null;

        var titular = await _repository.GetByDocumentoAsync(documentoNormalizado, cancellationToken);

        if (titular is null)
            return null;

        return new TitularResumoResponse(
            titular.Id,
            titular.Nome,
            titular.Tipo.ToString(),
            titular.DocumentoFormatado,
            titular.Associacao?.Nome ?? string.Empty);
    }

    private static string NormalizarDocumento(string documento)
    {
        return RemoverFormatacao().Replace(documento ?? string.Empty, string.Empty);
    }

    [GeneratedRegex(@"[^a-zA-Z0-9]")]
    private static partial Regex RemoverFormatacao();
}
