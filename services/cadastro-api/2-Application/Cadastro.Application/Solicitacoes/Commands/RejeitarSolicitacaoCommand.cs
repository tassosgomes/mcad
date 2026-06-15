using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Portal.Responses;

namespace Cadastro.Application.Solicitacoes.Commands;

/// <summary>
/// Command de rejeição de solicitação de alteração pelo Analista (RF-19).
/// <para>
/// Registra <c>JustificativaRejeicao</c> fornecida pelo Analista na entidade.
/// Sem efeito colateral no titular — a rejeição não altera o cadastro.
/// </para>
/// <para>
/// <c>AnalistaId</c> é extraído do claim <c>sub</c> do JWT.
/// </para>
/// </summary>
public record RejeitarSolicitacaoCommand(
    Guid Id,
    string JustificativaRejeicao,
    Guid AnalistaId) : ICommand<SolicitacaoResponse>;
