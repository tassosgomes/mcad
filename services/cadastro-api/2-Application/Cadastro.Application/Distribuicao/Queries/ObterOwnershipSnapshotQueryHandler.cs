using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Distribuicao.Responses;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Exceptions;
using Cadastro.Domain.Interfaces;

namespace Cadastro.Application.Distribuicao.Queries;

public class ObterOwnershipSnapshotQueryHandler : IQueryHandler<ObterOwnershipSnapshotQuery, OwnershipSnapshotResponse>
{
    private readonly IObraRepository _obraRepository;
    private readonly IFonogramaRepository _fonogramaRepository;
    private readonly ITitularidadeRepository _titularidadeRepository;
    private readonly IParticipacaoRepository _participacaoRepository;

    public ObterOwnershipSnapshotQueryHandler(
        IObraRepository obraRepository,
        IFonogramaRepository fonogramaRepository,
        ITitularidadeRepository titularidadeRepository,
        IParticipacaoRepository participacaoRepository)
    {
        _obraRepository = obraRepository;
        _fonogramaRepository = fonogramaRepository;
        _titularidadeRepository = titularidadeRepository;
        _participacaoRepository = participacaoRepository;
    }

    public async Task<OwnershipSnapshotResponse> HandleAsync(
        ObterOwnershipSnapshotQuery query,
        CancellationToken cancellationToken)
    {
        var obraIds = NormalizeIds(query.ObraIds);
        var fonogramaIds = NormalizeIds(query.FonogramaIds);

        var obras = obraIds.Count == 0
            ? []
            : (await _obraRepository.GetByIdsAsync(obraIds, cancellationToken)).ToList();
        var fonogramas = fonogramaIds.Count == 0
            ? []
            : (await _fonogramaRepository.GetByIdsAsync(fonogramaIds, cancellationToken)).ToList();

        EnsureAllFound("Obras não encontradas", obraIds, obras.Select(obra => obra.Id));
        EnsureAllFound("Fonogramas não encontrados", fonogramaIds, fonogramas.Select(fonograma => fonograma.Id));

        var titularidades = obraIds.Count == 0
            ? []
            : (await _titularidadeRepository.GetByObraIdsAsync(obraIds, cancellationToken)).ToList();
        var participacoes = fonogramaIds.Count == 0
            ? []
            : (await _participacaoRepository.GetByFonogramaIdsAsync(fonogramaIds, cancellationToken)).ToList();

        var titularidadesPorObra = titularidades
            .GroupBy(titularidade => titularidade.ObraId)
            .ToDictionary(group => group.Key, group => group.ToList());
        var participacoesPorFonograma = participacoes
            .GroupBy(participacao => participacao.FonogramaId)
            .ToDictionary(group => group.Key, group => group.ToList());

        return new OwnershipSnapshotResponse(
            obras.Select(obra => MapObra(obra, titularidadesPorObra)).ToList(),
            fonogramas.Select(fonograma => MapFonograma(fonograma, participacoesPorFonograma)).ToList());
    }

    private static List<Guid> NormalizeIds(IEnumerable<Guid> ids)
    {
        return ids
            .Distinct()
            .ToList();
    }

    private static void EnsureAllFound(string resourceName, IEnumerable<Guid> requestedIds, IEnumerable<Guid> foundIds)
    {
        var found = foundIds.ToHashSet();
        var missing = requestedIds.Where(id => !found.Contains(id)).ToList();
        if (missing.Count == 0)
        {
            return;
        }

        throw new DomainException($"{resourceName} para ownership snapshot: {string.Join(", ", missing)}");
    }

    private static ObraOwnershipSnapshotResponse MapObra(
        ObraMusical obra,
        IReadOnlyDictionary<Guid, List<TitularidadeAutoral>> titularidadesPorObra)
    {
        titularidadesPorObra.TryGetValue(obra.Id, out var titularidades);
        return new ObraOwnershipSnapshotResponse(
            obra.Id,
            obra.Titulo,
            MapStatusObra(obra.Status),
            (titularidades ?? []).Select(MapTitularidade).ToList());
    }

    private static TitularidadeOwnershipSnapshotResponse MapTitularidade(TitularidadeAutoral titularidade)
    {
        return new TitularidadeOwnershipSnapshotResponse(
            titularidade.TitularId,
            titularidade.Titular.Nome,
            titularidade.Titular.Associacao?.Sigla,
            titularidade.Categoria.ToString().ToUpperInvariant(),
            titularidade.Percentual);
    }

    private static FonogramaOwnershipSnapshotResponse MapFonograma(
        Fonograma fonograma,
        IReadOnlyDictionary<Guid, List<ParticipacaoConexa>> participacoesPorFonograma)
    {
        participacoesPorFonograma.TryGetValue(fonograma.Id, out var participacoes);
        return new FonogramaOwnershipSnapshotResponse(
            fonograma.Id,
            fonograma.ObraId,
            MapStatusFonograma(fonograma.Status),
            (participacoes ?? []).Select(MapParticipacao).ToList());
    }

    private static ParticipacaoOwnershipSnapshotResponse MapParticipacao(ParticipacaoConexa participacao)
    {
        return new ParticipacaoOwnershipSnapshotResponse(
            participacao.TitularId,
            participacao.Titular.Nome,
            participacao.Titular.Associacao?.Sigla,
            MapCategoriaConexo(participacao.Categoria),
            participacao.Percentual);
    }

    private static string MapStatusObra(StatusObra status)
    {
        return status == StatusObra.DominioPublico
            ? "DOMINIO_PUBLICO"
            : status.ToString().ToUpperInvariant();
    }

    private static string MapStatusFonograma(StatusFonograma status)
    {
        return status switch
        {
            StatusFonograma.PendenteValidacao => "PENDENTE_VALIDACAO",
            StatusFonograma.PendenteDocumentacao => "PENDENTE_DOCUMENTACAO",
            _ => status.ToString().ToUpperInvariant()
        };
    }

    private static string MapCategoriaConexo(CategoriaConexo categoria)
    {
        return categoria switch
        {
            CategoriaConexo.ProdutorFonografico => "PRODUTOR_FONOGRAFICO",
            CategoriaConexo.MusicoExecutante => "MUSICO_EXECUTANTE",
            _ => "INTERPRETE"
        };
    }
}
