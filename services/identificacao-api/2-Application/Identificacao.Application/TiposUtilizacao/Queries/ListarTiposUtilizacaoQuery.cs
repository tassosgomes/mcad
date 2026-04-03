using Identificacao.Application.Common;
using Identificacao.Application.TiposUtilizacao.Responses;

namespace Identificacao.Application.TiposUtilizacao.Queries;

public record ListarTiposUtilizacaoQuery() : IQuery<IEnumerable<TipoUtilizacaoResponse>>;
