using Identificacao.Application.Common;

namespace Identificacao.Application.Pendentes.Commands;

public record ResolverPendenteCommand(Guid ExecucaoId, Guid ObraId, Guid? FonogramaId) : ICommand<bool>;
