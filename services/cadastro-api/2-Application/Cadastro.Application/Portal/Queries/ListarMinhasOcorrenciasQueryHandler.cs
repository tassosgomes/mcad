using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Responses;
using Cadastro.Application.Portal.Commands;
using Cadastro.Application.Portal.Responses;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;

namespace Cadastro.Application.Portal.Queries;

/// <summary>
/// Lista as ocorrências do titular autenticado (RF-29, RF-30, RF-31).
/// <para>
/// O filtro <c>TitularId</c> é sempre o do <c>ICurrentTitular</c> (RF-31 — isolamento):
/// o titular não consegue ver ocorrências de outros.
/// O repositório aplica <c>AsNoTracking</c> + paginação + ordenação por <c>AbertaEm DESC</c>.
/// </para>
/// </summary>
public class ListarMinhasOcorrenciasQueryHandler
    : IQueryHandler<ListarMinhasOcorrenciasQuery, MinhasOcorrenciasResponse>
{
    private readonly IOcorrenciaRepository _repository;

    public ListarMinhasOcorrenciasQueryHandler(IOcorrenciaRepository repository)
    {
        _repository = repository;
    }

    public async Task<MinhasOcorrenciasResponse> HandleAsync(
        ListarMinhasOcorrenciasQuery query, CancellationToken cancellationToken)
    {
        // RF-31: isolamento — TitularId sempre do token (ICurrentTitular), repassado ao filtro.
        // O repositório aplica a cláusula WHERE no SQL (não há filtragem in-memory).
        var filtro = new OcorrenciaFiltro(
            Page: query.Page,
            Size: query.Size,
            Status: ParseStatus(query.Status),
            TitularId: query.TitularId,
            Tipo: null);

        var (items, total) = await _repository.ListarAsync(filtro, cancellationToken);

        var totalPages = query.Size > 0 ? (int)Math.Ceiling((double)total / query.Size) : 0;

        return new MinhasOcorrenciasResponse(
            Data: items.Select(CriarOcorrenciaCommandHandler.MapToResponse),
            Pagination: new PaginationResponse(query.Page, query.Size, total, totalPages));
    }

    /// <summary>
    /// Converte string SCREAMING_SNAKE_CASE para <see cref="StatusOcorrencia"/>.
    /// Retorna <c>null</c> para string vazia/nula (sem filtro).
    /// </summary>
    internal static StatusOcorrencia? ParseStatus(string? value) => value switch
    {
        null or "" => null,
        "ABERTA"    => StatusOcorrencia.Aberta,
        "EM_ANALISE" => StatusOcorrencia.EmAnalise,
        "RESOLVIDA" => StatusOcorrencia.Resolvida,
        "CANCELADA" => StatusOcorrencia.Cancelada,
        // Fallback genérico para variações de case/underscore — mantém robustez no parse.
        _ => Enum.TryParse<StatusOcorrencia>(value.Replace("_", string.Empty), ignoreCase: true, out var s)
            ? s
            : null
    };
}
