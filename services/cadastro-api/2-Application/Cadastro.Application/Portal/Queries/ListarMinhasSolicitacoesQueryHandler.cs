using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Responses;
using Cadastro.Application.Portal.Commands;
using Cadastro.Application.Portal.Responses;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;

namespace Cadastro.Application.Portal.Queries;

/// <summary>
/// Lista as solicitações de alteração do titular autenticado (RF-17).
/// <para>
/// O filtro <c>TitularId</c> é sempre o do <c>ICurrentTitular</c> (RF-17 — isolamento):
/// o titular não consegue ver solicitações de outros.
/// O repositório aplica <c>AsNoTracking</c> + paginação + ordenação por <c>SolicitadaEm DESC</c>.
/// </para>
/// </summary>
public class ListarMinhasSolicitacoesQueryHandler
    : IQueryHandler<ListarMinhasSolicitacoesQuery, MinhasSolicitacoesResponse>
{
    private readonly ISolicitacaoAlteracaoRepository _repository;

    public ListarMinhasSolicitacoesQueryHandler(ISolicitacaoAlteracaoRepository repository)
    {
        _repository = repository;
    }

    public async Task<MinhasSolicitacoesResponse> HandleAsync(
        ListarMinhasSolicitacoesQuery query, CancellationToken cancellationToken)
    {
        // RF-17: isolamento — TitularId sempre do token (ICurrentTitular), repassado ao filtro.
        // O repositório aplica a cláusula WHERE no SQL (não há filtragem in-memory).
        var filtro = new SolicitacaoFiltro(
            Page: query.Page,
            Size: query.Size,
            Status: ParseStatus(query.Status),
            TitularId: query.TitularId,
            Campo: null);

        var (items, total) = await _repository.ListarAsync(filtro, cancellationToken);

        var totalPages = query.Size > 0 ? (int)Math.Ceiling((double)total / query.Size) : 0;

        return new MinhasSolicitacoesResponse(
            Data: items.Select(AbrirSolicitacaoCommandHandler.MapToResponse),
            Pagination: new PaginationResponse(query.Page, query.Size, total, totalPages));
    }

    /// <summary>
    /// Converte string SCREAMING_SNAKE_CASE para <see cref="StatusSolicitacao"/>.
    /// Retorna <c>null</c> para string vazia/nula (sem filtro).
    /// </summary>
    internal static StatusSolicitacao? ParseStatus(string? value) => value switch
    {
        null or "" => null,
        "SOLICITADA" => StatusSolicitacao.Solicitada,
        "APROVADA"   => StatusSolicitacao.Aprovada,
        "REJEITADA"  => StatusSolicitacao.Rejeitada,
        // Fallback genérico para variações de case/underscore — mantém robustez no parse.
        _ => Enum.TryParse<StatusSolicitacao>(value.Replace("_", string.Empty), ignoreCase: true, out var s)
            ? s
            : null
    };
}
