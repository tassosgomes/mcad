using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Responses;
using Cadastro.Application.Portal.Responses;
using Cadastro.Domain.Interfaces;

namespace Cadastro.Application.Portal.Queries;

/// <summary>
/// Lista as obras (titularidades autorais) do titular autenticado (RF-22, RF-24, RF-26).
/// Projetando título/categoria/ISWC/percentual. Somente leitura (AsNoTracking no repositório).
/// </summary>
public class ObterMinhasObrasQueryHandler : IQueryHandler<ObterMinhasObrasQuery, MinhasObrasResponse>
{
    private readonly ITitularidadeRepository _repository;

    public ObterMinhasObrasQueryHandler(ITitularidadeRepository repository)
    {
        _repository = repository;
    }

    public async Task<MinhasObrasResponse> HandleAsync(ObterMinhasObrasQuery query, CancellationToken cancellationToken)
    {
        // RF-24: isolamento — somente titularId do token; a query nunca recebe titularId de fora.
        var titularidades = await _repository.GetByTitularIdAsync(query.TitularId, cancellationToken);

        // Projeção in-memory (já carregada com Obra pelo repositório).
        IEnumerable<ObraTitularResponse> items = titularidades
            .Select(MapToResponse)
            .ToList();

        // RF-26: filtro por título (case-insensitive, contains).
        if (!string.IsNullOrWhiteSpace(query.Filtro))
        {
            var filtro = query.Filtro.Trim();
            items = items.Where(o => o.Titulo.Contains(filtro, StringComparison.OrdinalIgnoreCase));
        }

        // RF-26: ordenação — prefixo "-" indica DESC; default título ASC.
        var (sortField, descending) = ParseSort(query.Sort);
        items = ApplySort(items, sortField, descending);

        var materialized = items.ToList();
        var total = materialized.Count;
        var totalPages = query.Size > 0 ? (int)Math.Ceiling((double)total / query.Size) : 0;

        var paged = materialized
            .Skip((query.Page - 1) * query.Size)
            .Take(query.Size)
            .ToList();

        return new MinhasObrasResponse(
            Data: paged,
            Pagination: new PaginationResponse(query.Page, query.Size, total, totalPages));
    }

    internal static ObraTitularResponse MapToResponse(Domain.Entities.TitularidadeAutoral t) => new(
        ObraId: t.ObraId,
        Titulo: t.Obra?.Titulo ?? string.Empty,
        Categoria: CategoriaToString(t.Categoria),
        Iswc: t.Obra?.Iswc,
        Percentual: t.Percentual);

    private static string CategoriaToString(Domain.Enums.CategoriaAutoral categoria) => categoria switch
    {
        Domain.Enums.CategoriaAutoral.Autor   => "AUTOR",
        Domain.Enums.CategoriaAutoral.Editor  => "EDITOR",
        _                                     => categoria.ToString().ToUpperInvariant()
    };

    private static (string field, bool descending) ParseSort(string? sort)
    {
        if (string.IsNullOrWhiteSpace(sort))
            return ("titulo", false);

        var value = sort.Trim();
        if (value.StartsWith('-'))
            return (value[1..].ToLowerInvariant(), true);

        return (value.ToLowerInvariant(), false);
    }

    private static IEnumerable<ObraTitularResponse> ApplySort(
        IEnumerable<ObraTitularResponse> source, string field, bool descending)
    {
        var comparer = StringComparer.OrdinalIgnoreCase;
        return field switch
        {
            "titulo" => descending
                ? source.OrderByDescending(o => o.Titulo, comparer)
                : source.OrderBy(o => o.Titulo, comparer),
            "categoria" => descending
                ? source.OrderByDescending(o => o.Categoria, comparer)
                : source.OrderBy(o => o.Categoria, comparer),
            "iswc" => descending
                ? source.OrderByDescending(o => o.Iswc ?? string.Empty, comparer)
                : source.OrderBy(o => o.Iswc ?? string.Empty, comparer),
            "percentual" => descending
                ? source.OrderByDescending(o => o.Percentual)
                : source.OrderBy(o => o.Percentual),
            _ => source.OrderBy(o => o.Titulo, comparer)
        };
    }
}
