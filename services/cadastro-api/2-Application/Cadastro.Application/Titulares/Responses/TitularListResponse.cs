using Cadastro.Application.Common.Responses;

namespace Cadastro.Application.Titulares.Responses;

/// <summary>
/// Response da listagem paginada de titulares.
/// Wrapper com data[] + pagination (conforme API Contract).
/// </summary>
public record TitularListResponse(
    IEnumerable<TitularResponse> Data,
    PaginationResponse Pagination);
