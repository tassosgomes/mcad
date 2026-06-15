using Cadastro.Application.Common.CQRS;
using Cadastro.Application.Portal.Responses;

namespace Cadastro.Application.Ocorrencias.Commands;

/// <summary>
/// Command de resolução de ocorrência pelo analista (RF-35, RF-39).
/// <para>
/// Transição <c>EM_ANALISE → RESOLVIDA</c>. O domínio (<c>Ocorrencia.Resolver</c>)
/// rejeita transições inválidas (RF-37) e exige <c>Parecer</c> não vazio.
/// </para>
/// <para>
/// <c>Parecer</c> mínimo exigido pelo domínio (não-vazio).
/// <c>AnalistaId</c> extraído do JWT — usado apenas para auditoria (RF-38).
/// </para>
/// </summary>
public record ResolverOcorrenciaCommand(
    Guid Id,
    Guid AnalistaId,
    string Parecer) : ICommand<OcorrenciaResponse>;
