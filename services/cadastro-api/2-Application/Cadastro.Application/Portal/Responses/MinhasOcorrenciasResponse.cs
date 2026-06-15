using Cadastro.Application.Common.Responses;

namespace Cadastro.Application.Portal.Responses;

/// <summary>
/// Lista paginada das ocorrências de um titular (RF-29, RF-30).
/// Segue o padrão de <c>MinhasObrasResponse</c>: <c>PaginationResponse</c> não-genérico.
/// </summary>
public record MinhasOcorrenciasResponse(
    IEnumerable<OcorrenciaResponse> Data,
    PaginationResponse Pagination);
