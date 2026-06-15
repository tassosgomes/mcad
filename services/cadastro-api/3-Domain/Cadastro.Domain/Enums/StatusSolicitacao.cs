namespace Cadastro.Domain.Enums;

/// <summary>
/// Estado da solicitação de alteração de dado sensível.
/// Transições válidas: SOLICITADA → APROVADA | REJEITADA.
/// </summary>
public enum StatusSolicitacao
{
    Solicitada,
    Aprovada,
    Rejeitada
}
