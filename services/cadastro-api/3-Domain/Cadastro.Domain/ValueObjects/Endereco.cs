using Cadastro.Domain.Exceptions;

namespace Cadastro.Domain.ValueObjects;

/// <summary>
/// Value Object imutável para endereço postal brasileiro.
/// Composto pelos VOs <see cref="Cep"/> e <see cref="Uf"/> mais campos de texto livres.
/// <c>Numero</c> é string para aceitar valores como "S/N" e "KM 12".
/// </summary>
public record Endereco
{
    private const int MaxTextoCurto = 20;
    private const int MaxTextoLongo = 150;

    public Cep Cep { get; }
    public string Logradouro { get; }
    public string Numero { get; }
    public string? Complemento { get; }
    public string Bairro { get; }
    public string Cidade { get; }
    public Uf Uf { get; }

    private Endereco(Cep cep, string logradouro, string numero, string? complemento, string bairro, string cidade, Uf uf)
    {
        Cep = cep;
        Logradouro = logradouro;
        Numero = numero;
        Complemento = complemento;
        Bairro = bairro;
        Cidade = cidade;
        Uf = uf;
    }

    /// <summary>
    /// Factory method — único ponto de criação de um endereço válido.
    /// Valida campos obrigatórios e limites de tamanho.
    /// </summary>
    public static Endereco Create(
        Cep cep,
        string logradouro,
        string numero,
        string? complemento,
        string bairro,
        string cidade,
        Uf uf)
    {
        if (cep is null) throw new DomainException("CEP é obrigatório");
        if (uf is null) throw new DomainException("UF é obrigatória");

        var logradouroNormalizado = ValidarTexto(logradouro, "Logradouro", MaxTextoLongo);
        var numeroNormalizado = ValidarTexto(numero, "Número", MaxTextoCurto);
        var bairroNormalizado = ValidarTexto(bairro, "Bairro", MaxTextoLongo);
        var cidadeNormalizado = ValidarTexto(cidade, "Cidade", MaxTextoLongo);

        var complementoNormalizado = string.IsNullOrWhiteSpace(complemento)
            ? null
            : complemento!.Trim();
        if (complementoNormalizado?.Length > MaxTextoLongo)
            throw new DomainException("Complemento deve ter no máximo 150 caracteres");

        return new Endereco(
            cep,
            logradouroNormalizado,
            numeroNormalizado,
            complementoNormalizado,
            bairroNormalizado,
            cidadeNormalizado,
            uf);
    }

    private static string ValidarTexto(string valor, string nome, int tamanhoMaximo)
    {
        var normalizado = (valor ?? "").Trim();
        if (normalizado.Length == 0)
            throw new DomainException($"{nome} é obrigatório");
        if (normalizado.Length > tamanhoMaximo)
            throw new DomainException($"{nome} deve ter no máximo {tamanhoMaximo} caracteres");
        return normalizado;
    }
}
