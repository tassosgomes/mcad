using Identificacao.Application.Cancelamento.Responses;
using Identificacao.Application.Common;

namespace Identificacao.Application.Cancelamento.Queries;

public record PodeCancelarQuery(Guid CaptacaoId) : IQuery<PodeCancelarResponse>;
