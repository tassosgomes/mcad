using Cadastro.Application.Common.Responses;

namespace Cadastro.Application.Portal.Responses;

/// <summary>
/// Lista paginada dos fonogramas de um titular (RF-23).
/// </summary>
public record MeusFonogramasResponse(
    IEnumerable<FonogramaTitularResponse> Data,
    PaginationResponse Pagination);
