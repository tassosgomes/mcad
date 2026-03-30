using Cadastro.Domain.Enums;
using Cadastro.Domain.ValueObjects;

namespace Cadastro.Domain.Entities;

/// <summary>
/// Entidade de domínio Titular — representa pessoa física ou jurídica titular de direitos autorais.
/// Usa Value Objects Cpf, Cnpj e CaeIpi diretamente (não strings).
/// Tipo (PF/PJ) e documento são imutáveis após criação (RF-11).
/// </summary>
public class Titular
{
    public Guid Id { get; private set; }
    public string Nome { get; private set; }
    public TipoTitular Tipo { get; private set; }

    /// <summary>Preenchido apenas se Tipo == PF</summary>
    public Cpf? Cpf { get; private set; }

    /// <summary>Preenchido apenas se Tipo == PJ</summary>
    public Cnpj? Cnpj { get; private set; }

    public string Nacionalidade { get; private set; }

    /// <summary>Código CAE/IPI — opcional</summary>
    public CaeIpi? CaeIpi { get; private set; }

    public Guid AssociacaoId { get; private set; }
    public StatusTitular Status { get; private set; }
    public DateTime CriadoEm { get; private set; }
    public DateTime AtualizadoEm { get; private set; }

    // Navigation property — carregada via Include() nas queries
    public Associacao Associacao { get; private set; } = null!;

    /// <summary>Construtor privado para o EF Core</summary>
    private Titular()
    {
        Nome = string.Empty;
        Nacionalidade = string.Empty;
    }

    /// <summary>
    /// Documento cru (sem formatação): Cpf.Valor ou Cnpj.Valor.
    /// Usado para busca e unicidade.
    /// </summary>
    public string Documento => Tipo == TipoTitular.PF ? Cpf!.Valor : Cnpj!.Valor;

    /// <summary>
    /// Documento formatado para exibição: 000.000.000-00 (CPF) ou AA.BBB.CCC/DDDD-EE (CNPJ).
    /// </summary>
    public string DocumentoFormatado => Tipo == TipoTitular.PF ? Cpf!.Formatado : Cnpj!.Formatado;

    /// <summary>
    /// Factory method para criar titular Pessoa Física.
    /// Garante Cpf preenchido e Cnpj = null.
    /// </summary>
    public static Titular CriarPessoaFisica(
        string nome,
        Cpf cpf,
        string nacionalidade,
        Guid associacaoId,
        CaeIpi? caeIpi = null)
    {
        return new Titular
        {
            Id = Guid.NewGuid(),
            Nome = nome ?? throw new ArgumentNullException(nameof(nome)),
            Tipo = TipoTitular.PF,
            Cpf = cpf ?? throw new ArgumentNullException(nameof(cpf)),
            Cnpj = null,
            Nacionalidade = nacionalidade ?? throw new ArgumentNullException(nameof(nacionalidade)),
            AssociacaoId = associacaoId,
            CaeIpi = caeIpi,
            Status = StatusTitular.Ativo,
            CriadoEm = DateTime.UtcNow,
            AtualizadoEm = DateTime.UtcNow,
        };
    }

    /// <summary>
    /// Factory method para criar titular Pessoa Jurídica.
    /// Garante Cnpj preenchido e Cpf = null.
    /// </summary>
    public static Titular CriarPessoaJuridica(
        string nome,
        Cnpj cnpj,
        string nacionalidade,
        Guid associacaoId,
        CaeIpi? caeIpi = null)
    {
        return new Titular
        {
            Id = Guid.NewGuid(),
            Nome = nome ?? throw new ArgumentNullException(nameof(nome)),
            Tipo = TipoTitular.PJ,
            Cpf = null,
            Cnpj = cnpj ?? throw new ArgumentNullException(nameof(cnpj)),
            Nacionalidade = nacionalidade ?? throw new ArgumentNullException(nameof(nacionalidade)),
            AssociacaoId = associacaoId,
            CaeIpi = caeIpi,
            Status = StatusTitular.Ativo,
            CriadoEm = DateTime.UtcNow,
            AtualizadoEm = DateTime.UtcNow,
        };
    }

    /// <summary>
    /// Atualiza os campos editáveis do titular.
    /// Tipo e Documento são imutáveis (RF-11) — não incluídos neste método.
    /// </summary>
    public void Atualizar(
        string nome,
        string nacionalidade,
        Guid associacaoId,
        StatusTitular status,
        CaeIpi? caeIpi)
    {
        Nome = nome ?? throw new ArgumentNullException(nameof(nome));
        Nacionalidade = nacionalidade ?? throw new ArgumentNullException(nameof(nacionalidade));
        AssociacaoId = associacaoId;
        Status = status;
        CaeIpi = caeIpi;
        AtualizadoEm = DateTime.UtcNow;
    }
}
