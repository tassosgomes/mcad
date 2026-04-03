using Identificacao.Application.Common;

namespace Identificacao.Application.Execucoes.Commands;

public record ExcluirExecucaoCommand(Guid CaptacaoId, Guid Id, Guid AnalistaId) : ICommand<bool>;
