namespace Identificacao.Application.Fechamento.Payloads;

public record RolFechadoPayload(
    Guid CaptacaoId,
    string Rubrica,
    string Periodo,
    DateTime FechadoEm,
    Guid AnalistaId,
    IEnumerable<ExecucaoRolPayload> Execucoes);

public record ExecucaoRolPayload(
    Guid ObraId,
    Guid? FonogramaId,
    int Quantidade,
    string? TipoUtilizacao,
    decimal? Peso,
    string? Inicio,
    string? Fim,
    int? DuracaoSegundos);
