using Identificacao.Application.Common;

namespace Identificacao.Application.Pendentes.Commands;

public record ResolverPendenteCommand(Guid CaptacaoId, Guid ExecucaoId, Guid ObraId, Guid? FonogramaId) : ICommand<bool>;
