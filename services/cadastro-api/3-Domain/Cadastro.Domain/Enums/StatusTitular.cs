namespace Cadastro.Domain.Enums;

/// <summary>
/// Status operacional do titular.
/// FALECIDO é informativo — não bloqueia operações (RN-10).
/// Status default na criação: Ativo (RF-08).
/// </summary>
public enum StatusTitular
{
    Ativo,
    Falecido,
    Transferindo
}
