namespace Cadastro.Application.Fonogramas.Responses;

public record ObraResumoResponse(
    Guid Id,
    string Titulo,
    string Status
);
