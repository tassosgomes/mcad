using Cadastro.Application.Common.Responses;

namespace Cadastro.Application.Portal.Responses;

/// <summary>
/// Lista paginada das solicitações de alteração do titular autenticado (RF-17).
/// Segue o padrão de <c>MinhasOcorrenciasResponse</c>: <c>PaginationResponse</c> não-genérico.
/// </summary>
public record MinhasSolicitacoesResponse(
    IEnumerable<SolicitacaoResponse> Data,
    PaginationResponse Pagination);
