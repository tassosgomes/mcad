using System.Text.RegularExpressions;
using Cadastro.Domain.Exceptions;

namespace Cadastro.Domain.ValueObjects;

/// <summary>
/// Value Object imutável para endereço de e-mail.
/// Validação via regex RFC simples (local-part@dominínio.tld).
/// Normaliza para minúsculas e remove espaços das bordas.
/// </summary>
public record Email
{
    private static readonly Regex Pattern = new(
        @"^[^@\s]+@[^@\s]+\.[^@\s]+$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    public string Valor { get; }

    private Email(string valor) => Valor = valor;

    /// <summary>
    /// Factory method — único ponto de criação de um e-mail válido.
    /// Normaliza (trim + lower) antes de validar.
    /// </summary>
    public static Email Create(string valor)
    {
        var normalizado = (valor ?? "").Trim().ToLowerInvariant();
        if (normalizado.Length == 0 || normalizado.Length > 254 || !Pattern.IsMatch(normalizado))
            throw new DomainException("E-mail inválido");
        return new Email(normalizado);
    }
}
