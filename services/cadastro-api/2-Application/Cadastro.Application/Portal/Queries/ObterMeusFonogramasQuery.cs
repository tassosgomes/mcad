using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Portal.Responses;

namespace Cadastro.Application.Portal.Queries;

/// <summary>
/// Lista os fonogramas (participações conexas) do titular autenticado (RF-23, RF-24).
/// TitularId é sempre extraído do JWT (<c>ICurrentTitular</c>) no endpoint — nunca da query string.
/// </summary>
public record ObterMeusFonogramasQuery(
    Guid TitularId,
    int Page = 1,
    int Size = 20,
    string? Filtro = null,
    string? Sort = "titulo") : IQuery<MeusFonogramasResponse>;
