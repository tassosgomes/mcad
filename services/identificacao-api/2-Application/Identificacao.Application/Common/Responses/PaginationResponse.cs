namespace Identificacao.Application.Common.Responses;

public record PaginationResponse(
    int Page,
    int Size,
    int Total,
    int TotalPages
);
