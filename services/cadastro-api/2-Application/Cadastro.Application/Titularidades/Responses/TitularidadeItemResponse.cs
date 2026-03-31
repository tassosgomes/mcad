namespace Cadastro.Application.Titularidades.Responses;

public record TitularidadeItemResponse(
    Guid Id,
    TitularResumoResponse Titular,
    string Categoria,
    decimal Percentual
);
