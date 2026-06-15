using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Portal.Responses;

namespace Cadastro.Application.Portal.Queries;

/// <summary>
/// Lista as solicitações de alteração do titular autenticado com filtro opcional por status
/// (RF-17).
/// <para>
/// <c>TitularId</c> é sempre extraído do JWT (<c>ICurrentTitular</c>) no endpoint — nunca da query string
/// (RF-17 — isolamento: o titular não consegue ver solicitações de outros).
/// <c>Status</c> é a string SCREAMING_SNAKE_CASE de <c>StatusSolicitacao</c>
/// (<c>SOLICITADA</c>, <c>APROVADA</c>, <c>REJEITADA</c>); <c>null</c> = todos.
/// </para>
/// </summary>
public record ListarMinhasSolicitacoesQuery(
    Guid TitularId,
    string? Status = null,
    int Page = 1,
    int Size = 20) : IQuery<MinhasSolicitacoesResponse>;
