using System.Text.RegularExpressions;
using Cadastro.Domain.Exceptions;

namespace Cadastro.Domain.ValueObjects;

/// <summary>
/// Value Object imutável para CPF (Cadastro de Pessoas Físicas).
/// Validação via algoritmo módulo 11 numérico — encapsula regra no Domain Layer.
/// Construtor privado impede criação sem validação.
/// </summary>
public record Cpf
{
    public string Valor { get; }

    private Cpf(string valor) => Valor = valor;

    /// <summary>
    /// Factory method — único ponto de criação de um CPF válido.
    /// Remove formatação automáticamente antes de validar.
    /// </summary>
    public static Cpf Create(string valor)
    {
        var limpo = Regex.Replace(valor ?? "", @"[^0-9]", "");
        if (limpo.Length != 11 || !IsValid(limpo))
            throw new DomainException("CPF inválido");
        return new Cpf(limpo);
    }

    /// <summary>CPF no formato 000.000.000-00</summary>
    public string Formatado => $"{Valor[..3]}.{Valor[3..6]}.{Valor[6..9]}-{Valor[9..]}";

    /// <summary>
    /// Algoritmo módulo 11 padrão para CPF.
    /// Rejeita sequências repetidas (ex: 000.000.000-00, 111.111.111-11).
    /// </summary>
    private static bool IsValid(string cpf)
    {
        // Rejeita sequências repetidas
        if (cpf.Distinct().Count() == 1) return false;

        // Validação do 1º dígito verificador
        var sum1 = 0;
        for (var i = 0; i < 9; i++)
            sum1 += (cpf[i] - '0') * (10 - i);
        var remainder1 = sum1 % 11;
        var digit1 = remainder1 < 2 ? 0 : 11 - remainder1;
        if ((cpf[9] - '0') != digit1) return false;

        // Validação do 2º dígito verificador
        var sum2 = 0;
        for (var i = 0; i < 10; i++)
            sum2 += (cpf[i] - '0') * (11 - i);
        var remainder2 = sum2 % 11;
        var digit2 = remainder2 < 2 ? 0 : 11 - remainder2;
        return (cpf[10] - '0') == digit2;
    }
}
