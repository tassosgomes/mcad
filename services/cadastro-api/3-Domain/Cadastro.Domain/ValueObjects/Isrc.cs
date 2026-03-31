using System.Text.RegularExpressions;
using Cadastro.Domain.Exceptions;

namespace Cadastro.Domain.ValueObjects;

public record Isrc
{
    public string Valor { get; }

    private Isrc(string valor) => Valor = valor;

    public static Isrc Create(string valor)
    {
        var limpo = Regex.Replace(valor ?? "", @"[^a-zA-Z0-9]", "").ToUpperInvariant();
        if (limpo.Length != 12 || !IsValid(limpo))
            throw new DomainException("ISRC deve seguir formato CC-XXX-YY-NNNNN (12 caracteres alfanuméricos)");
        return new Isrc(limpo);
    }

    private static bool IsValid(string isrc)
    {
        // Posições 0-1: letras (país)
        if (!char.IsLetter(isrc[0]) || !char.IsLetter(isrc[1])) return false;
        // Posições 2-4: alfanumérico (registrante)
        // Posições 5-6: dígitos (ano)
        if (!char.IsDigit(isrc[5]) || !char.IsDigit(isrc[6])) return false;
        // Posições 7-11: dígitos (número)
        for (int i = 7; i < 12; i++)
            if (!char.IsDigit(isrc[i])) return false;
        return true;
    }

    // BR-ABC-23-12345
    public string Formatado =>
        $"{Valor[..2]}-{Valor[2..5]}-{Valor[5..7]}-{Valor[7..]}";
}
