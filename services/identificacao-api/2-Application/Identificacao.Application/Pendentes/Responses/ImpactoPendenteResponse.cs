using Identificacao.Application.Common.Responses;

namespace Identificacao.Application.Pendentes.Responses;

public record CaptacaoImpactoDto(Guid CaptacaoId, string Rubrica, string Periodo, int Quantidade);

public record ImpactoPendenteResponse(
    string Identificador,
    string Tipo,
    string? ObraTitulo,
    int QuantidadeExecucoes,
    int CaptacoesAfetadas,
    List<CaptacaoImpactoDto> Captacoes
);

public record ImpactoPendenteListResponse(
    IEnumerable<ImpactoPendenteResponse> Items,
    PaginationResponse Pagination
);
