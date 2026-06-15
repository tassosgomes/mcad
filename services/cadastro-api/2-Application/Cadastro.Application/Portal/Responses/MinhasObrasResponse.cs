using Cadastro.Application.Common.Responses;

namespace Cadastro.Application.Portal.Responses;

/// <summary>
/// Lista paginada das obras de um titular (RF-22).
/// </summary>
public record MinhasObrasResponse(
    IEnumerable<ObraTitularResponse> Data,
    PaginationResponse Pagination);
