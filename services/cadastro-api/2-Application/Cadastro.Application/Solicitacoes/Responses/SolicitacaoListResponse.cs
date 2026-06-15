using Cadastro.Application.Common.Responses;
using Cadastro.Application.Portal.Responses;

namespace Cadastro.Application.Solicitacoes.Responses;

/// <summary>
/// Lista paginada de solicitações de alteração para o painel do Analista.
/// Sem isolamento por titular — o Analista vê todas as solicitações (diferente
/// de <c>MinhasSolicitacoesResponse</c>, que é do Portal do titular).
/// </summary>
public record SolicitacaoListResponse(
    IEnumerable<SolicitacaoResponse> Data,
    PaginationResponse Pagination);
