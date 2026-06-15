using System.Text.RegularExpressions;
using Cadastro.Domain.Exceptions;

namespace Cadastro.Domain.ValueObjects;

/// <summary>
/// Value Object imutável para CEP (Código de Endereçamento Postal).
/// Aceita formatos "01001-000" ou "01001000" e normaliza para 8 dígitos.
/// </summary>
public record Cep
{
    public string Valor { get; }

    private Cep(string valor) => Valor = valor;

    /// <summary>
    /// Factory method — único ponto de criação de um CEP válido.
    /// Remove formatação automaticamente antes de validar.
    /// </summary>
    public static Cep Create(string valor)
    {
        var limpo = Regex.Replace(valor ?? "", @"[^0-9]", "");
        if (limpo.Length != 8)
            throw new DomainException("CEP inválido");
        return new Cep(limpo);
    }

    /// <summary>CEP no formato 01001-000.</summary>
    public string Formatado => $"{Valor[..5]}-{Valor[5..]}";
}
