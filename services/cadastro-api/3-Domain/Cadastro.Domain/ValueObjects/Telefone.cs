using System.Text.RegularExpressions;
using Cadastro.Domain.Exceptions;

namespace Cadastro.Domain.ValueObjects;

/// <summary>
/// Value Object imutável para número de telefone brasileiro.
/// Aceita DDD (2 dígitos, 11–99) + 8 (fixo) ou 9 (celular) dígitos.
/// Normaliza removendo não-dígitos antes de validar.
/// </summary>
public record Telefone
{
    public string Valor { get; }

    private Telefone(string valor) => Valor = valor;

    /// <summary>
    /// Factory method — único ponto de criação de um telefone válido.
    /// Remove formatação automaticamente antes de validar.
    /// </summary>
    public static Telefone Create(string numero)
    {
        var limpo = Regex.Replace(numero ?? "", @"[^0-9]", "");
        if (limpo.Length is not (10 or 11) || !IsDddValido(limpo))
            throw new DomainException("Telefone inválido");
        return new Telefone(limpo);
    }

    /// <summary>
    /// Telefone no formato (DD) 99999-0000 (11 dígitos) ou (DD) 3333-0000 (10 dígitos).
    /// </summary>
    public string Formatado => Valor.Length == 11
        ? $"({Valor[..2]}) {Valor[2..7]}-{Valor[7..]}"
        : $"({Valor[..2]}) {Valor[2..6]}-{Valor[6..]}";

    /// <summary>
    /// DDD (posições 0-1) deve formar número entre 11 e 99 (sem zero à esquerda).
    /// </summary>
    private static bool IsDddValido(string digitos)
    {
        var ddd = (digitos[0] - '0') * 10 + (digitos[1] - '0');
        return ddd is >= 11 and <= 99;
    }
}
