using Identificacao.Application.Common.Responses;

namespace Identificacao.Application.Captacoes.Responses;

public record CaptacaoListResponse(
    IEnumerable<CaptacaoResponse> Data,
    PaginationResponse Pagination
);
