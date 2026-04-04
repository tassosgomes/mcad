namespace Identificacao.Application.Fechamento.Responses;

public record FechamentoResponse(
    Guid CaptacaoId,
    string Status,
    DateTime FechadoEm,
    int TotalExecucoes,
    bool Sucesso);
