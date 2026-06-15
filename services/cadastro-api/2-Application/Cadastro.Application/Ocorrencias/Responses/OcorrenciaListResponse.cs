using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Responses;
using Cadastro.Application.Portal.Responses;

namespace Cadastro.Application.Ocorrencias.Responses;

/// <summary>
/// Lista paginada de ocorrências para o analista (RF-33).
/// Sem isolamento por titular — o analista vê todas as ocorrências (diferente
/// de <c>MinhasOcorrenciasResponse</c>, que é do Portal do titular).
/// </summary>
public record OcorrenciaListResponse(
    IEnumerable<OcorrenciaResponse> Data,
    PaginationResponse Pagination);
