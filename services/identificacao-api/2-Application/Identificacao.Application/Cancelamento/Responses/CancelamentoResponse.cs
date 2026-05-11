namespace Identificacao.Application.Cancelamento.Responses;

public record CancelamentoResponse(
    Guid CaptacaoCanceladaId,
    string Status,
    string Justificativa,
    DateTime CanceladoEm,
    string OpcaoRecriacao,
    Guid? NovaCaptacaoId,
    int? ExecucoesCopiadas,
    bool EventoPublicado);
