using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace Identificacao.Application.Common;

public class Dispatcher : IDispatcher
{
    private readonly IServiceProvider _serviceProvider;

    public Dispatcher(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    public async Task<TResult> QueryAsync<TResult>(IQuery<TResult> query, CancellationToken ct)
    {
        var handlerType = typeof(IQueryHandler<,>).MakeGenericType(query.GetType(), typeof(TResult));
        dynamic handler = _serviceProvider.GetRequiredService(handlerType);
        return await handler.HandleAsync((dynamic)query, ct);
    }

    public async Task<TResult> SendAsync<TResult>(ICommand<TResult> command, CancellationToken ct)
    {
        await ValidateCommandAsync(command, ct);

        var handlerType = typeof(ICommandHandler<,>).MakeGenericType(command.GetType(), typeof(TResult));
        dynamic handler = _serviceProvider.GetRequiredService(handlerType);
        return await handler.HandleAsync((dynamic)command, ct);
    }

    private async Task ValidateCommandAsync<TResult>(ICommand<TResult> command, CancellationToken ct)
    {
        var validatorType = typeof(IValidator<>).MakeGenericType(command.GetType());
        var validators = _serviceProvider.GetServices(validatorType).Cast<IValidator>().ToList();

        if (validators.Count == 0)
        {
            return;
        }

        var contextType = typeof(ValidationContext<>).MakeGenericType(command.GetType());
        var context = (IValidationContext)Activator.CreateInstance(contextType, command)!;
        var results = await Task.WhenAll(validators.Select(v => v.ValidateAsync(context, ct)));
        var failures = results
            .SelectMany(r => r.Errors)
            .Where(f => f is not null)
            .ToList();

        if (failures.Count != 0)
        {
            throw new ValidationException(failures);
        }
    }
}
