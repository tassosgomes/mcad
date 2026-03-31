using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Titularidades.Responses;

namespace Cadastro.Application.Titularidades.Queries;

public record BuscarTitularesQuery(string Q, int Limit = 10) : IQuery<IEnumerable<TitularResumoResponse>>;
