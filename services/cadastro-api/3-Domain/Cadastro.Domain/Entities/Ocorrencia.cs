using Cadastro.Domain.Enums;
using Cadastro.Domain.Exceptions;

namespace Cadastro.Domain.Entities;

/// <summary>
/// Ocorrência aberta pelo titular para reportar erro de cadastro em obra/fonograma.
/// State machine: <c>ABERTA → EM_ANALISE → RESOLVIDA | CANCELADA</c>.
/// Transições inválidas lançam <see cref="DomainException"/> (RF-37).
/// </summary>
public class Ocorrencia
{
    public Guid Id { get; private set; }
    public Guid TitularId { get; private set; }
    public TipoOcorrencia Tipo { get; private set; }
    public Guid? ObraId { get; private set; }
    public Guid? FonogramaId { get; private set; }
    public string Descricao { get; private set; }
    public StatusOcorrencia Status { get; private set; }
    public string? Resolucao { get; private set; }
    public string? JustificativaCancelamento { get; private set; }
    public DateTime AbertaEm { get; private set; }
    public DateTime? ResolvidaEm { get; private set; }

    /// <summary>Construtor privado para o EF Core.</summary>
    private Ocorrencia()
    {
        Descricao = string.Empty;
    }

    /// <summary>
    /// Factory method — único ponto de criação de uma ocorrência.
    /// Nasce no estado <see cref="StatusOcorrencia.Aberta"/> (RF-28).
    /// Pode referenciar uma obra, um fonograma, ou nenhum (caso seja apenas dado cadastral).
    /// </summary>
    public static Ocorrencia Criar(
        Guid titularId,
        TipoOcorrencia tipo,
        string descricao,
        Guid? obraId = null,
        Guid? fonogramaId = null)
    {
        if (titularId == Guid.Empty)
            throw new DomainException("TitularId é obrigatório");
        if (string.IsNullOrWhiteSpace(descricao))
            throw new DomainException("Descrição é obrigatória");

        return new Ocorrencia
        {
            Id = Guid.NewGuid(),
            TitularId = titularId,
            Tipo = tipo,
            Descricao = descricao.Trim(),
            ObraId = obraId,
            FonogramaId = fonogramaId,
            Status = StatusOcorrencia.Aberta,
            AbertaEm = DateTime.UtcNow,
        };
    }

    /// <summary>
    /// Move a ocorrência de <see cref="StatusOcorrencia.Aberta"/> para
    /// <see cref="StatusOcorrencia.EmAnalise"/> (RF-34).
    /// </summary>
    public void AssumirAnalise()
    {
        if (Status != StatusOcorrencia.Aberta)
            throw new DomainException($"Transição inválida: {Status} → {StatusOcorrencia.EmAnalise}");

        Status = StatusOcorrencia.EmAnalise;
    }

    /// <summary>
    /// Move a ocorrência de <see cref="StatusOcorrencia.EmAnalise"/> para
    /// <see cref="StatusOcorrencia.Resolvida"/> registrando o parecer (RF-35).
    /// </summary>
    public void Resolver(string parecer)
    {
        if (Status != StatusOcorrencia.EmAnalise)
            throw new DomainException($"Transição inválida: {Status} → {StatusOcorrencia.Resolvida}");
        if (string.IsNullOrWhiteSpace(parecer))
            throw new DomainException("Parecer de resolução é obrigatório");

        Status = StatusOcorrencia.Resolvida;
        Resolucao = parecer.Trim();
        ResolvidaEm = DateTime.UtcNow;
    }

    /// <summary>
    /// Cancela a ocorrência a partir de <see cref="StatusOcorrencia.Aberta"/> ou
    /// <see cref="StatusOcorrencia.EmAnalise"/> registrando a justificativa (RF-36).
    /// </summary>
    public void Cancelar(string justificativa)
    {
        if (Status != StatusOcorrencia.Aberta && Status != StatusOcorrencia.EmAnalise)
            throw new DomainException($"Transição inválida: {Status} → {StatusOcorrencia.Cancelada}");
        if (string.IsNullOrWhiteSpace(justificativa))
            throw new DomainException("Justificativa de cancelamento é obrigatória");

        Status = StatusOcorrencia.Cancelada;
        JustificativaCancelamento = justificativa.Trim();
        ResolvidaEm = DateTime.UtcNow;
    }
}
