using Cadastro.Application.Common.Responses;

namespace Cadastro.Application.Fonogramas.Responses;

public record FonogramaListResponse(
    IEnumerable<FonogramaResponse> Data,
    PaginationResponse Pagination
);
