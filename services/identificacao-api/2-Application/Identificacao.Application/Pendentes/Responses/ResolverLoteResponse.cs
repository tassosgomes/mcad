namespace Identificacao.Application.Pendentes.Responses;

public record DetalheRejeicao(Guid ExecucaoId, string Motivo);

public record ResolverLoteResponse(
    int TotalResolvidas,
    int TotalRejeitadas,
    List<DetalheRejeicao> DetalhesRejeitadas
);
