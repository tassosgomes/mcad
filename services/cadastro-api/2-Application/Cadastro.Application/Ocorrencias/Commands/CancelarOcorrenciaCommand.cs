using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Portal.Responses;

namespace Cadastro.Application.Ocorrencias.Commands;

/// <summary>
/// Command de cancelamento de ocorrência pelo analista (RF-36).
/// <para>
/// Transição <c>ABERTA|EM_ANALISE → CANCELADA</c>. O domínio (<c>Ocorrencia.Cancelar</c>)
/// rejeita transições inválidas (RF-37) e exige <c>Justificativa</c> não vazia.
/// </para>
/// <para>
/// <c>Justificativa</c> mínima exigida pelo domínio (não-vazia).
/// <c>AnalistaId</c> extraído do JWT — usado apenas para auditoria (RF-38).
/// </para>
/// </summary>
public record CancelarOcorrenciaCommand(
    Guid Id,
    Guid AnalistaId,
    string Justificativa) : ICommand<OcorrenciaResponse>;
