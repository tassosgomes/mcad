using Cadastro.Domain.Enums;
using Cadastro.Domain.Exceptions;

namespace Cadastro.Domain.Entities;

/// <summary>
/// Solicitação de alteração de dado sensível aberta pelo titular e decidida pelo Analista.
/// State machine: <c>SOLICITADA → APROVADA | REJEITADA</c>.
/// </summary>
/// <remarks>
/// RF-20: o vínculo de associação só pode ser alterado, jamais removido.
/// Validação executada em <see cref="Criar"/> quando <see cref="Campo"/> for
/// <see cref="CampoSolicitacao.Associacao"/>.
/// </remarks>
public class SolicitacaoAlteracao
{
    public Guid Id { get; private set; }
    public Guid TitularId { get; private set; }
    public CampoSolicitacao Campo { get; private set; }
    public string ValorAtual { get; private set; }
    public string ValorPretendido { get; private set; }
    public string Justificativa { get; private set; }
    public StatusSolicitacao Status { get; private set; }
    public DateTime SolicitadaEm { get; private set; }
    public Guid? DecisaoPor { get; private set; }
    public DateTime? DecididaEm { get; private set; }
    public string? JustificativaRejeicao { get; private set; }

    /// <summary>Construtor privado para o EF Core.</summary>
    private SolicitacaoAlteracao()
    {
        ValorAtual = string.Empty;
        ValorPretendido = string.Empty;
        Justificativa = string.Empty;
    }

    /// <summary>
    /// Factory method — único ponto de criação de uma solicitação.
    /// Nasce no estado <see cref="StatusSolicitacao.Solicitada"/> (RF-15).
    /// <para>
    /// RF-20: se <paramref name="campo"/> for <see cref="CampoSolicitacao.Associacao"/>,
    /// <paramref name="valorPretendido"/> não pode ser vazio — o vínculo só pode ser
    /// alterado para outra associação, jamais removido.
    /// </para>
    /// </summary>
    public static SolicitacaoAlteracao Criar(
        Guid titularId,
        CampoSolicitacao campo,
        string valorAtual,
        string valorPretendido,
        string justificativa)
    {
        if (titularId == Guid.Empty)
            throw new DomainException("TitularId é obrigatório");
        if (campo == CampoSolicitacao.Associacao && string.IsNullOrWhiteSpace(valorPretendido))
            throw new DomainException("O vínculo de associação só pode ser alterado, nunca removido");
        if (string.IsNullOrWhiteSpace(valorPretendido))
            throw new DomainException("Valor pretendido é obrigatório");
        if (string.IsNullOrWhiteSpace(justificativa))
            throw new DomainException("Justificativa é obrigatória");

        return new SolicitacaoAlteracao
        {
            Id = Guid.NewGuid(),
            TitularId = titularId,
            Campo = campo,
            ValorAtual = valorAtual?.Trim() ?? string.Empty,
            ValorPretendido = valorPretendido.Trim(),
            Justificativa = justificativa.Trim(),
            Status = StatusSolicitacao.Solicitada,
            SolicitadaEm = DateTime.UtcNow,
        };
    }

    /// <summary>
    /// Aprova a solicitação, registrando quem decidiu e quando (RF-16, RF-18).
    /// Só permitido a partir de <see cref="StatusSolicitacao.Solicitada"/>.
    /// </summary>
    public void Aprovar(Guid decisaoPor)
    {
        if (Status != StatusSolicitacao.Solicitada)
            throw new DomainException($"Transição inválida: {Status} → {StatusSolicitacao.Aprovada}");
        if (decisaoPor == Guid.Empty)
            throw new DomainException("DecisaoPor é obrigatório");

        Status = StatusSolicitacao.Aprovada;
        DecisaoPor = decisaoPor;
        DecididaEm = DateTime.UtcNow;
    }

    /// <summary>
    /// Rejeita a solicitação com justificativa fornecida pelo Analista (RF-19).
    /// Só permitido a partir de <see cref="StatusSolicitacao.Solicitada"/>.
    /// </summary>
    public void Rejeitar(Guid decisaoPor, string justificativaRejeicao)
    {
        if (Status != StatusSolicitacao.Solicitada)
            throw new DomainException($"Transição inválida: {Status} → {StatusSolicitacao.Rejeitada}");
        if (decisaoPor == Guid.Empty)
            throw new DomainException("DecisaoPor é obrigatório");
        if (string.IsNullOrWhiteSpace(justificativaRejeicao))
            throw new DomainException("Justificativa de rejeição é obrigatória");

        Status = StatusSolicitacao.Rejeitada;
        DecisaoPor = decisaoPor;
        DecididaEm = DateTime.UtcNow;
        JustificativaRejeicao = justificativaRejeicao.Trim();
    }
}
