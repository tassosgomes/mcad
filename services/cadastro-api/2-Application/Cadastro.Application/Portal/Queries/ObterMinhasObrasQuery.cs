using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Portal.Responses;

namespace Cadastro.Application.Portal.Queries;

/// <summary>
/// Lista as obras (titularidades autorais) do titular autenticado (RF-22, RF-24, RF-26).
/// TitularId é sempre extraído do JWT (<c>ICurrentTitular</c>) no endpoint — nunca da query string.
/// </summary>
public record ObterMinhasObrasQuery(
    Guid TitularId,
    int Page = 1,
    int Size = 20,
    string? Filtro = null,
    string? Sort = "titulo") : IQuery<MinhasObrasResponse>;
