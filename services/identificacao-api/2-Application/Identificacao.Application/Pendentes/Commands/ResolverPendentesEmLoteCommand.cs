using Identificacao.Application.Common;
using Identificacao.Application.Pendentes.Responses;

namespace Identificacao.Application.Pendentes.Commands;

public record ExecucaoTarget(Guid CaptacaoId, Guid ExecucaoId);
public record ResolverPendentesEmLoteCommand(List<ExecucaoTarget> Execucoes, Guid ObraId, Guid? FonogramaId) : ICommand<ResolverLoteResponse>;
