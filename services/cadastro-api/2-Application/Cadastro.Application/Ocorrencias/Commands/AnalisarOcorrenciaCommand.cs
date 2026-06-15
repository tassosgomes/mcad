using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Portal.Responses;

namespace Cadastro.Application.Ocorrencias.Commands;

/// <summary>
/// Command de assunção de análise de uma ocorrência pelo analista (RF-34).
/// <para>
/// Transição <c>ABERTA → EM_ANALISE</c>. O domínio (<c>Ocorrencia.AssumirAnalise</c>)
/// rejeita transições inválidas lançando <c>DomainException</c> (RF-37).
/// </para>
/// <para>
/// <c>AnalistaId</c> é extraído do JWT (<c>sub</c>) no endpoint — usado apenas para
/// fins de auditoria/log (RF-38), não é persistido na entidade.
/// </para>
/// </summary>
public record AnalisarOcorrenciaCommand(
    Guid Id,
    Guid AnalistaId) : ICommand<OcorrenciaResponse>;
