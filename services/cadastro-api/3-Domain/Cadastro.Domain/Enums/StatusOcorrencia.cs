namespace Cadastro.Domain.Enums;

/// <summary>
/// Estado da ocorrência no fluxo de triagem do Analista.
/// Transições válidas: ABERTA → EM_ANALISE → RESOLVIDA | CANCELADA.
/// </summary>
public enum StatusOcorrencia
{
    Aberta,
    EmAnalise,
    Resolvida,
    Cancelada
}
