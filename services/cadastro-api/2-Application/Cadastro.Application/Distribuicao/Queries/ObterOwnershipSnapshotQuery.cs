using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Distribuicao.Responses;

namespace Cadastro.Application.Distribuicao.Queries;

public record ObterOwnershipSnapshotQuery(
    IReadOnlyCollection<Guid> ObraIds,
    IReadOnlyCollection<Guid> FonogramaIds) : IQuery<OwnershipSnapshotResponse>;
