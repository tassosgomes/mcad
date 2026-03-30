using Cadastro.Domain.Exceptions;

namespace Cadastro.Domain.ValueObjects;

/// <summary>
/// Value Object imutável para código CAE/IPI (Código de Autor Internacional).
/// Validação simples de tamanho: 1 a 20 caracteres.
/// Campo opcional no titular — representado como nullable (CaeIpi?) na entidade.
/// </summary>
public record CaeIpi
{
    public string Valor { get; }

    private CaeIpi(string valor) => Valor = valor;

    /// <summary>
    /// Factory method — único ponto de criação de um CaeIpi válido.
    /// </summary>
    public static CaeIpi Create(string valor)
    {
        var limpo = valor?.Trim() ?? "";
        if (limpo.Length == 0 || limpo.Length > 20)
            throw new DomainException("CAE/IPI deve ter entre 1 e 20 caracteres");
        return new CaeIpi(limpo);
    }
}
