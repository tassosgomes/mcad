namespace Cadastro.Application.Fonogramas.Responses;

public record FonogramaResumoResponse(
    Guid Id,
    long Codigo,
    string IsrcFormatado,
    string Status,
    string PaisOrigem,
    DateOnly? DataLancamento
);
