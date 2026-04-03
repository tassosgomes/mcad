namespace Cadastro.Application.Titularidades.Responses;

public record TitularResumoResponse(
    Guid Id,
    long Codigo,
    string Nome,
    string Tipo,
    string DocumentoFormatado,
    string? AssociacaoSigla
);
