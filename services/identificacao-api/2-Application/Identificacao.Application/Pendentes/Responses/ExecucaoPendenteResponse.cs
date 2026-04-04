using Identificacao.Application.Common.Responses;

namespace Identificacao.Application.Pendentes.Responses;

public record ExecucaoPendenteResponse(
    Guid Id, Guid CaptacaoId,
    string CaptacaoRubrica, string CaptacaoPeriodo, string CaptacaoStatus,
    string CaptacaoAnalistaResponsavel,
    Guid? ObraId, Guid? FonogramaId,
    string ObraTitulo, string? FonogramaIsrc, string? ObraIswc, string Interpretes,
    string Inicio, string Fim, int Quantidade,
    string Status, DateTime CriadoEm);

public record ExecucaoPendenteListResponse(
    IEnumerable<ExecucaoPendenteResponse> Items,
    PaginationResponse Pagination
);
