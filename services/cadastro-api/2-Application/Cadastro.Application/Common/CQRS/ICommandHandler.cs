namespace Cadastro.Application.Common.CQRS;

/// <summary>
/// Contrato para handlers de commands CQRS — para features futuras com escrita.
/// </summary>
public interface ICommandHandler<in TCommand, TResult>
    where TCommand : ICommand<TResult>
{
    Task<TResult> HandleAsync(TCommand command, CancellationToken cancellationToken);
}
