using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Titularidades.Responses;

namespace Cadastro.Application.Titularidades.Queries;

public record ListarTitularidadesQuery(Guid ObraId) : IQuery<TitularidadesResponse>;
