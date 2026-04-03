namespace Cadastro.Domain.Entities;

/// <summary>
/// Entidade de domínio Associação — representa as 7 associações de gestão coletiva do ECAD.
/// Dados imutáveis (sem operações de escrita via API ou interface).
/// </summary>
public class Associacao
{
    public Guid Id { get; private set; }
    public long Codigo { get; private set; }
    public string Nome { get; private set; }
    public string Sigla { get; private set; }
    public string Cnpj { get; private set; }

    /// <summary>
    /// Construtor privado para o EF Core (required for mapping).
    /// </summary>
    private Associacao()
    {
        Nome = string.Empty;
        Sigla = string.Empty;
        Cnpj = string.Empty;
    }

    /// <summary>
    /// Construtor público para criação da entidade (seed e testes).
    /// </summary>
    public Associacao(Guid id, string nome, string sigla, string cnpj)
    {
        Id = id;
        Nome = nome ?? throw new ArgumentNullException(nameof(nome));
        Sigla = sigla ?? throw new ArgumentNullException(nameof(sigla));
        Cnpj = cnpj ?? throw new ArgumentNullException(nameof(cnpj));
    }
}
