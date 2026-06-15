using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Responses;
using Cadastro.Application.Portal.Commands;
using Cadastro.Application.Solicitacoes.Responses;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;

namespace Cadastro.Application.Solicitacoes.Queries;

/// <summary>
/// Lista todas as solicitações de alteração para o painel do Analista.
/// <para>
/// Filtros opcionais: <c>Status</c> (SCREAMING_SNAKE_CASE), <c>TitularId</c>, <c>Campo</c>.
/// Sem isolamento por titular — o Analista vê todas as solicitações.
/// </para>
/// </summary>
public class ListarSolicitacoesQueryHandler
    : IQueryHandler<ListarSolicitacoesQuery, SolicitacaoListResponse>
{
    private readonly ISolicitacaoAlteracaoRepository _repository;

    public ListarSolicitacoesQueryHandler(ISolicitacaoAlteracaoRepository repository)
    {
        _repository = repository;
    }

    public async Task<SolicitacaoListResponse> HandleAsync(
        ListarSolicitacoesQuery query, CancellationToken cancellationToken)
    {
        var filtro = new SolicitacaoFiltro(
            Page: query.Page,
            Size: query.Size,
            Status: ParseStatus(query.Status),
            TitularId: query.TitularId,
            Campo: ParseCampo(query.Campo));

        var (items, total) = await _repository.ListarAsync(filtro, cancellationToken);

        var totalPages = query.Size > 0 ? (int)Math.Ceiling((double)total / query.Size) : 0;

        return new SolicitacaoListResponse(
            Data: items.Select(AbrirSolicitacaoCommandHandler.MapToResponse),
            Pagination: new PaginationResponse(query.Page, query.Size, total, totalPages));
    }

    private static StatusSolicitacao? ParseStatus(string? value) => value switch
    {
        null or "" => null,
        "SOLICITADA" => StatusSolicitacao.Solicitada,
        "APROVADA"   => StatusSolicitacao.Aprovada,
        "REJEITADA"  => StatusSolicitacao.Rejeitada,
        _ => Enum.TryParse<StatusSolicitacao>(value.Replace("_", string.Empty), ignoreCase: true, out var s)
            ? s
            : null
    };

    private static CampoSolicitacao? ParseCampo(string? value) => value switch
    {
        null or "" => null,
        "NOME"        => CampoSolicitacao.Nome,
        "CAE_IPI"     => CampoSolicitacao.CaeIpi,
        "ASSOCIACAO"  => CampoSolicitacao.Associacao,
        "CATEGORIA"   => CampoSolicitacao.Categoria,
        _ => Enum.TryParse<CampoSolicitacao>(value.Replace("_", string.Empty), ignoreCase: true, out var c)
            ? c
            : null
    };
}
