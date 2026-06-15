using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Portal.Responses;

namespace Cadastro.Application.Solicitacoes.Commands;

/// <summary>
/// Command de aprovação de solicitação de alteração de dado sensível pelo Analista
/// (RF-16, RF-18).
/// <para>
/// <c>AnalistaId</c> é extraído do claim <c>sub</c> do JWT — registrado na entidade
/// e usado para auditoria.
/// </para>
/// <para>
/// Ao aprovar, o handler aplica o efeito colateral no <c>Titular</c> conforme o
/// <c>Campo</c> da solicitação (Nome, CAE/IPI, Associação, Categoria), revalidando
/// invariantes de domínio. Auditoria two-tier registra antes/depois (RF-18).
/// </para>
/// </summary>
public record AprovarSolicitacaoCommand(
    Guid Id,
    Guid AnalistaId) : ICommand<SolicitacaoResponse>;
