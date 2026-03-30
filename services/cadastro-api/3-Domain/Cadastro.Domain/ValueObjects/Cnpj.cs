using System.Text.RegularExpressions;
using Cadastro.Domain.Exceptions;

namespace Cadastro.Domain.ValueObjects;

/// <summary>
/// Value Object imutável para CNPJ — suporta formato alfanumérico RFB e numérico legado.
/// Validação via algoritmo módulo 11 com conversão ASCII - 48 (posições 1-12).
/// DVs (posições 13-14) são sempre numéricos.
/// Referência: docs/validacoes/cnpj.md
/// </summary>
public record Cnpj
{
    public string Valor { get; }

    private Cnpj(string valor) => Valor = valor.ToUpperInvariant();

    /// <summary>
    /// Factory method — único ponto de criação de um CNPJ válido.
    /// Remove formatação automáticamente antes de validar.
    /// Aceita tanto CNPJ numérico legado quanto alfanumérico RFB.
    /// </summary>
    public static Cnpj Create(string valor)
    {
        var limpo = Regex.Replace(valor ?? "", @"[^a-zA-Z0-9]", "").ToUpperInvariant();
        if (limpo.Length != 14 || !IsValid(limpo))
            throw new DomainException("CNPJ inválido");
        return new Cnpj(limpo);
    }

    /// <summary>
    /// CNPJ no formato AA.BBB.CCC/DDDD-EE (funciona para numérico e alfanumérico).
    /// Exemplo numérico: 00.000.000/0001-00
    /// Exemplo alfanumérico: A1.B2C.3D4/1A2B-99
    /// </summary>
    public string Formatado =>
        $"{Valor[..2]}.{Valor[2..5]}.{Valor[5..8]}/{Valor[8..12]}-{Valor[12..]}";

    /// <summary>
    /// Algoritmo módulo 11 com conversão ASCII - 48 (conforme nova regra RFB).
    /// Retrocompatível: CNPJs numéricos legados seguem o mesmo cálculo (0-9 → ASCII 48-57 → valor 0-9).
    /// </summary>
    private static bool IsValid(string cnpj)
    {
        // DVs (posições 13 e 14) devem ser sempre numéricos
        if (!char.IsDigit(cnpj[12]) || !char.IsDigit(cnpj[13])) return false;

        int[] w1 = { 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2 };
        int[] w2 = { 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2 };

        var dv1 = CalculateDigit(cnpj[..12], w1);
        var dv2 = CalculateDigit(cnpj[..12] + dv1, w2);

        return cnpj[12] - '0' == dv1 && cnpj[13] - '0' == dv2;
    }

    private static int CalculateDigit(string input, int[] weights)
    {
        var sum = 0;
        for (var i = 0; i < weights.Length; i++)
        {
            // Conversão ASCII - 48: dígitos 0-9 viram 0-9; letras A=17, B=18, ..., Z=42
            var value = input[i] - 48;
            sum += value * weights[i];
        }
        var remainder = sum % 11;
        return remainder < 2 ? 0 : 11 - remainder;
    }
}
