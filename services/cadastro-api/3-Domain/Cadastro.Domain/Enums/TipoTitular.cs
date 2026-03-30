namespace Cadastro.Domain.Enums;

/// <summary>
/// Tipo do titular: Pessoa Física (PF) ou Pessoa Jurídica (PJ).
/// PF → CPF obrigatório. PJ → CNPJ obrigatório.
/// Imutável após criação (RF-11).
/// </summary>
public enum TipoTitular
{
    PF,
    PJ
}
