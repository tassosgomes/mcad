using Identificacao.Application.Common;
using Identificacao.Application.Rubricas.Responses;

namespace Identificacao.Application.Rubricas.Queries;

public record ListarRubricasQuery() : IQuery<IEnumerable<RubricaResponse>>;
