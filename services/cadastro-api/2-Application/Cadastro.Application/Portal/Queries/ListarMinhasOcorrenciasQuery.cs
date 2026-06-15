using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Portal.Responses;

namespace Cadastro.Application.Portal.Queries;

/// <summary>
/// Lista as ocorrências do titular autenticado com filtro opcional por status (RF-29, RF-30, RF-31).
/// <para>
/// <c>TitularId</c> é sempre extraído do JWT (<c>ICurrentTitular</c>) no endpoint — nunca da query string.
/// <c>Status</c> é a string SCREAMING_SNAKE_CASE de <c>StatusOcorrencia</c>
/// (<c>ABERTA</c>, <c>EM_ANALISE</c>, <c>RESOLVIDA</c>, <c>CANCELADA</c>); <c>null</c> = todos.
/// </para>
/// </summary>
public record ListarMinhasOcorrenciasQuery(
    Guid TitularId,
    string? Status = null,
    int Page = 1,
    int Size = 20) : IQuery<MinhasOcorrenciasResponse>;
