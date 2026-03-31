namespace Cadastro.Application.Fonogramas.Responses;

public record FonogramaResumoResponse(
    Guid Id,
    string IsrcFormatado,
    string Status,
    string PaisOrigem,
    DateOnly? DataLancamento
);
