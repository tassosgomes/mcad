namespace Identificacao.Domain.Entities;

public class Rubrica
{
    public Guid Id { get; private set; }
    public string Sigla { get; private set; } = string.Empty;
    public string Nome { get; private set; } = string.Empty;
    public bool ExigeClassificacao { get; private set; }

    private Rubrica() { } // Para o EF Core

    public static Rubrica Criar(Guid id, string sigla, string nome, bool exigeClassificacao)
    {
        return new Rubrica
        {
            Id = id,
            Sigla = sigla,
            Nome = nome,
            ExigeClassificacao = exigeClassificacao
        };
    }
}
