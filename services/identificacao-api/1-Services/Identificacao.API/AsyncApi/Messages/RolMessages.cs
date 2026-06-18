namespace Identificacao.API.AsyncApi.Messages;

/// <summary>Campo `data` do evento identificacao.rol.fechado</summary>
/// <param name="Periodo">Período de identificação no formato YYYY-MM</param>
public record RolFechadoPayload(
    Guid CaptacaoId,
    string Rubrica,
    string Periodo,
    DateTime FechadoEm,
    Guid AnalistaId,
    IEnumerable<ExecucaoRolPayload> Execucoes);

/// <summary>Campo `data` do evento identificacao.rol.cancelado</summary>
/// <param name="Periodo">Período de identificação no formato YYYY-MM</param>
public record RolCanceladoPayload(
    Guid CaptacaoId,
    string Rubrica,
    string Periodo,
    DateTime CanceladoEm,
    Guid AnalistaId,
    string Justificativa);

/// <summary>Execução musical individual dentro do rol fechado</summary>
/// <param name="Inicio">Horário de início da execução (HH:mm)</param>
/// <param name="Fim">Horário de fim da execução (HH:mm)</param>
public record ExecucaoRolPayload(
    Guid ObraId,
    Guid? FonogramaId,
    int Quantidade,
    string? TipoUtilizacao,
    decimal? Peso,
    string? Inicio,
    string? Fim,
    int? DuracaoSegundos);
