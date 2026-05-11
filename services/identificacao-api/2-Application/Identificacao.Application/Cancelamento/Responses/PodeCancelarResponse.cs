namespace Identificacao.Application.Cancelamento.Responses;

public record PodeCancelarResponse(
    Guid CaptacaoId,
    bool PodeCancelar,
    string? Motivo,
    bool DistribuicaoProcessada,
    DateTime? DistribuicaoProcessadaEm);
