using Cadastro.Application.Common.CQRS;

namespace Cadastro.Application.Repertorios.Queries;

public record BuscarTitularPorDocumentoQuery(string Documento) : IQuery<TitularResumoResponse?>;

public record TitularResumoResponse(
    Guid Id,
    string Nome,
    string Tipo,
    string DocumentoFormatado,
    string Associacao);
