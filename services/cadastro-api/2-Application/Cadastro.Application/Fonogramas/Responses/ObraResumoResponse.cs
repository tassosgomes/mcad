namespace Cadastro.Application.Fonogramas.Responses;

public record ObraResumoResponse(
    Guid Id,
    long Codigo,
    string Titulo,
    string Status
);
