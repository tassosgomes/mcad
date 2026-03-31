using Cadastro.Application.Common.Responses;

namespace Cadastro.Application.Obras.Responses;

public record ObraListResponse(
    IEnumerable<ObraResponse> Data,
    PaginationResponse Pagination
);
