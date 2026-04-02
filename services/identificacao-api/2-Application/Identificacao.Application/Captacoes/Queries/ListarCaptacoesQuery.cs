using Identificacao.Application.Common;
using Identificacao.Application.Captacoes.Responses;

namespace Identificacao.Application.Captacoes.Queries;

public record ListarCaptacoesQuery(
    Guid? RubricaId = null,
    DateOnly? PeriodoInicial = null,
    DateOnly? PeriodoFinal = null,
    Identificacao.Domain.Enums.StatusCaptacao? Status = null,
    Guid? AnalistaResponsavelId = null,
    string? Sort = null,
    int? Page = 1,
    int? Size = 10
) : IQuery<(IEnumerable<CaptacaoResponse> Items, int Total)>;
