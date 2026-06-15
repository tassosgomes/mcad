using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Common.Responses;
using Cadastro.Application.Portal.Responses;
using Cadastro.Domain.Interfaces;

namespace Cadastro.Application.Portal.Queries;

/// <summary>
/// Lista os fonogramas (participações conexas) do titular autenticado (RF-23, RF-24).
/// Projetando título da obra/ISRC/papel/percentual. Somente leitura (AsNoTracking no repositório).
/// </summary>
public class ObterMeusFonogramasQueryHandler : IQueryHandler<ObterMeusFonogramasQuery, MeusFonogramasResponse>
{
    private readonly IParticipacaoRepository _repository;

    public ObterMeusFonogramasQueryHandler(IParticipacaoRepository repository)
    {
        _repository = repository;
    }

    public async Task<MeusFonogramasResponse> HandleAsync(ObterMeusFonogramasQuery query, CancellationToken cancellationToken)
    {
        // RF-24: isolamento — somente titularId do token; a query nunca recebe titularId de fora.
        var participacoes = await _repository.GetByTitularIdAsync(query.TitularId, cancellationToken);

        // Projeção in-memory (já carregada com Fonograma.Obra pelo repositório).
        IEnumerable<FonogramaTitularResponse> items = participacoes
            .Select(MapToResponse)
            .ToList();

        // RF-26 (aplicado também a fonogramas para UX consistente): filtro por título da obra.
        if (!string.IsNullOrWhiteSpace(query.Filtro))
        {
            var filtro = query.Filtro.Trim();
            items = items.Where(f => f.TituloObra.Contains(filtro, StringComparison.OrdinalIgnoreCase));
        }

        // Ordenação — prefixo "-" indica DESC; default título ASC.
        var (sortField, descending) = ParseSort(query.Sort);
        items = ApplySort(items, sortField, descending);

        var materialized = items.ToList();
        var total = materialized.Count;
        var totalPages = query.Size > 0 ? (int)Math.Ceiling((double)total / query.Size) : 0;

        var paged = materialized
            .Skip((query.Page - 1) * query.Size)
            .Take(query.Size)
            .ToList();

        return new MeusFonogramasResponse(
            Data: paged,
            Pagination: new PaginationResponse(query.Page, query.Size, total, totalPages));
    }

    internal static FonogramaTitularResponse MapToResponse(Domain.Entities.ParticipacaoConexa p) => new(
        FonogramaId: p.FonogramaId,
        TituloObra: p.Fonograma?.Obra?.Titulo ?? string.Empty,
        Isrc: p.Fonograma?.Isrc?.Formatado ?? string.Empty,
        Papel: CategoriaToString(p.Categoria),
        Percentual: p.Percentual);

    private static string CategoriaToString(Domain.Enums.CategoriaConexo categoria) => categoria switch
    {
        Domain.Enums.CategoriaConexo.ProdutorFonografico => "PRODUTOR_FONOGRAFICO",
        Domain.Enums.CategoriaConexo.MusicoExecutante    => "MUSICO_EXECUTANTE",
        _                                                => "INTERPRETE"
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

    private static IEnumerable<FonogramaTitularResponse> ApplySort(
        IEnumerable<FonogramaTitularResponse> source, string field, bool descending)
    {
        var comparer = StringComparer.OrdinalIgnoreCase;
        return field switch
        {
            "titulo" or "tituloobra" => descending
                ? source.OrderByDescending(o => o.TituloObra, comparer)
                : source.OrderBy(o => o.TituloObra, comparer),
            "isrc" => descending
                ? source.OrderByDescending(o => o.Isrc, comparer)
                : source.OrderBy(o => o.Isrc, comparer),
            "papel" => descending
                ? source.OrderByDescending(o => o.Papel, comparer)
                : source.OrderBy(o => o.Papel, comparer),
            "percentual" => descending
                ? source.OrderByDescending(o => o.Percentual ?? 0m)
                : source.OrderBy(o => o.Percentual ?? 0m),
            _ => source.OrderBy(o => o.TituloObra, comparer)
        };
    }
}
