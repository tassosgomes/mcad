namespace Identificacao.Application.Cancelamento.Payloads;

public record RolCanceladoPayload(
    Guid CaptacaoId,
    string Rubrica,
    string Periodo,
    DateTime CanceladoEm,
    Guid AnalistaId,
    string Justificativa);
