using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Obras.Responses;

namespace Cadastro.Application.Obras.Queries;

public record GetObraByIdQuery(Guid Id) : IQuery<ObraResponse>;
