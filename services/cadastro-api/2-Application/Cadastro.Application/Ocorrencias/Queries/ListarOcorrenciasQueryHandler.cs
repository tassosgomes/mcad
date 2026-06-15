using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Responses;
using Cadastro.Application.Ocorrencias.Responses;
using Cadastro.Application.Portal.Commands;
using Cadastro.Application.Portal.Queries;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;

namespace Cadastro.Application.Ocorrencias.Queries;

/// <summary>
/// Lista todas as ocorrências para o analista (RF-33).
/// <para>
/// Sem isolamento por titular — o analista vê todas as ocorrências.
/// Paginação + filtros opcionais por status, titular e tipo.
/// </para>
/// </summary>
public class ListarOcorrenciasQueryHandler
    : IQueryHandler<ListarOcorrenciasQuery, OcorrenciaListResponse>
{
    private readonly IOcorrenciaRepository _repository;

    public ListarOcorrenciasQueryHandler(IOcorrenciaRepository repository)
    {
        _repository = repository;
    }

    public async Task<OcorrenciaListResponse> HandleAsync(
        ListarOcorrenciasQuery query, CancellationToken cancellationToken)
    {
        // RF-33: sem filtro fixo de TitularId — analista vê todas.
        var filtro = new OcorrenciaFiltro(
            Page: query.Page,
            Size: query.Size,
            Status: ListarMinhasOcorrenciasQueryHandler.ParseStatus(query.Status),
            TitularId: query.TitularId,
            Tipo: ParseTipo(query.Tipo));

        var (items, total) = await _repository.ListarAsync(filtro, cancellationToken);

        var totalPages = query.Size > 0 ? (int)Math.Ceiling((double)total / query.Size) : 0;

        return new OcorrenciaListResponse(
            Data: items.Select(CriarOcorrenciaCommandHandler.MapToResponse),
            Pagination: new PaginationResponse(query.Page, query.Size, total, totalPages));
    }

    /// <summary>
    /// Converte string SCREAMING_SNAKE_CASE para <see cref="TipoOcorrencia"/>.
    /// Retorna <c>null</c> para string vazia/nula (sem filtro).
    /// </summary>
    private static TipoOcorrencia? ParseTipo(string? value) => value switch
    {
        null or "" => null,
        _ => Enum.TryParse<TipoOcorrencia>(value.Replace("_", string.Empty), ignoreCase: true, out var t)
            ? t
            : null
    };
}
