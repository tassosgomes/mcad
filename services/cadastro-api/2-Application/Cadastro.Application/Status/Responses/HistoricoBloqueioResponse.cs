namespace Cadastro.Application.Status.Responses;

public record HistoricoBloqueioResponse(
    Guid Id,
    string Acao,
    string? Justificativa,
    DateTime DataHora
);
