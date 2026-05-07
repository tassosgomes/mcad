namespace Cadastro.Application.Distribuicao.Responses;

public record OwnershipSnapshotResponse(
    IReadOnlyCollection<ObraOwnershipSnapshotResponse> Obras,
    IReadOnlyCollection<FonogramaOwnershipSnapshotResponse> Fonogramas);

public record ObraOwnershipSnapshotResponse(
    Guid ObraId,
    string Titulo,
    string Status,
    IReadOnlyCollection<TitularidadeOwnershipSnapshotResponse> Titularidades);

public record TitularidadeOwnershipSnapshotResponse(
    Guid TitularId,
    string Nome,
    string? AssociacaoSigla,
    string Categoria,
    decimal Percentual);

public record FonogramaOwnershipSnapshotResponse(
    Guid FonogramaId,
    Guid ObraId,
    string Status,
    IReadOnlyCollection<ParticipacaoOwnershipSnapshotResponse> Participacoes);

public record ParticipacaoOwnershipSnapshotResponse(
    Guid TitularId,
    string Nome,
    string? AssociacaoSigla,
    string Categoria,
    decimal? Percentual);
