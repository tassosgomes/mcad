using Identificacao.Application.Common;
using Identificacao.Application.Pendentes.Responses;

namespace Identificacao.Application.Pendentes.Queries;

public record ListarImpactoPendentesQuery(
    Guid? CaptacaoId = null,
    Guid? RubricaId = null,
    DateOnly? PeriodoInicio = null,
    DateOnly? PeriodoFim = null,
    string? Q = null,
    string? Sort = null,
    int? Page = 1,
    int? Size = 10
) : IQuery<ImpactoPendenteListResponse>;
