using Identificacao.Application.Common;
using Identificacao.Application.Execucoes.Responses;

namespace Identificacao.Application.Execucoes.Queries;

public record ListarExecucoesQuery(
    Guid CaptacaoId,
    string? Status,
    string? Sort,
    int? Page,
    int? Size
) : IQuery<ListarExecucoesResponse>;

public record ListarExecucoesResponse(
    IEnumerable<ExecucaoResponse> Items,
    int Total
);
