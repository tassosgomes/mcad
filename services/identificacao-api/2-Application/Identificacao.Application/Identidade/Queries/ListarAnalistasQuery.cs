using Identificacao.Application.Captacoes.Responses;
using Identificacao.Application.Common;

namespace Identificacao.Application.Identidade.Queries;

public record ListarAnalistasQuery() : IQuery<IEnumerable<AnalistaResumoResponse>>;
