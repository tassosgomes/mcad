namespace Cadastro.Application.Common.CQRS;

/// <summary>
/// Implementação nativa do Dispatcher usando IServiceProvider.
/// Resolve handlers via DI sem MediatR — segue padrão da stack dotnet-architecture.
/// </summary>
public class Dispatcher : IDispatcher
{
    private readonly IServiceProvider _serviceProvider;

    public Dispatcher(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    public async Task<TResult> QueryAsync<TResult>(IQuery<TResult> query, CancellationToken cancellationToken = default)
    {
        var handlerType = typeof(IQueryHandler<,>).MakeGenericType(query.GetType(), typeof(TResult));
        var handler = _serviceProvider.GetService(handlerType)
            ?? throw new InvalidOperationException(
                $"No handler registered for query type {query.GetType().Name}.");

        var handleMethod = handlerType.GetMethod("HandleAsync")
            ?? throw new InvalidOperationException(
                $"Method 'HandleAsync' not found in handler for {query.GetType().Name}.");

        var task = (Task<TResult>)handleMethod.Invoke(handler, [query, cancellationToken])!;
        return await task;
    }

    /// <summary>
    /// Despacha um command para o ICommandHandler correspondente via DI.
    /// Adicionado em F02 — primeira feature com operações de escrita.
    /// </summary>
    public async Task<TResult> SendAsync<TResult>(ICommand<TResult> command, CancellationToken cancellationToken = default)
    {
        var handlerType = typeof(ICommandHandler<,>).MakeGenericType(command.GetType(), typeof(TResult));
        var handler = _serviceProvider.GetService(handlerType)
            ?? throw new InvalidOperationException(
                $"No handler registered for command type {command.GetType().Name}.");

        var handleMethod = handlerType.GetMethod("HandleAsync")
            ?? throw new InvalidOperationException(
                $"Method 'HandleAsync' not found in handler for {command.GetType().Name}.");

        var task = (Task<TResult>)handleMethod.Invoke(handler, [command, cancellationToken])!;
        return await task;
    }
}

