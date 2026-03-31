namespace Cadastro.Application.Titularidades.Responses;

public record TitularResumoResponse(
    Guid Id,
    string Nome,
    string Tipo,
    string DocumentoFormatado,
    string? AssociacaoSigla
);
