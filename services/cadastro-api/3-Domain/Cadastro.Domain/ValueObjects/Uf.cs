using Cadastro.Domain.Exceptions;

namespace Cadastro.Domain.ValueObjects;

/// <summary>
/// Value Object imutável para Unidade da Federação (UF).
/// Valida as 27 UFs brasileiras (case-insensitive) e normaliza para maiúsculo.
/// </summary>
public record Uf
{
    private static readonly HashSet<string> Validas = new(StringComparer.OrdinalIgnoreCase)
    {
        "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
        "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
        "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
    };

    public string Valor { get; }

    private Uf(string valor) => Valor = valor;

    /// <summary>
    /// Factory method — único ponto de criação de uma UF válida.
    /// Normaliza para maiúsculo antes de validar.
    /// </summary>
    public static Uf Create(string valor)
    {
        var normalizado = (valor ?? "").Trim().ToUpperInvariant();
        if (normalizado.Length != 2 || !Validas.Contains(normalizado))
            throw new DomainException("UF inválida");
        return new Uf(normalizado);
    }
}
