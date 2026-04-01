namespace Cadastro.Domain.Entities;

public class HistoricoBloqueio
{
    public Guid Id { get; private set; }
    public string EntidadeTipo { get; private set; } = string.Empty; // "OBRA" ou "FONOGRAMA"
    public Guid EntidadeId { get; private set; }
    public string Acao { get; private set; } = string.Empty;          // "BLOQUEIO" ou "DESBLOQUEIO"
    public string? Justificativa { get; private set; }
    public DateTime DataHora { get; private set; }

    private HistoricoBloqueio() { }

    public static HistoricoBloqueio CriarBloqueio(string entidadeTipo, Guid entidadeId, string justificativa)
    {
        return new HistoricoBloqueio
        {
            Id = Guid.NewGuid(),
            EntidadeTipo = entidadeTipo,
            EntidadeId = entidadeId,
            Acao = "BLOQUEIO",
            Justificativa = justificativa,
            DataHora = DateTime.UtcNow,
        };
    }

    public static HistoricoBloqueio CriarDesbloqueio(string entidadeTipo, Guid entidadeId)
    {
        return new HistoricoBloqueio
        {
            Id = Guid.NewGuid(),
            EntidadeTipo = entidadeTipo,
            EntidadeId = entidadeId,
            Acao = "DESBLOQUEIO",
            Justificativa = null,
            DataHora = DateTime.UtcNow,
        };
    }
}
