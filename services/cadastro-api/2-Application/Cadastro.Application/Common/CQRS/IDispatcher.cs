namespace Cadastro.Application.Common.CQRS;

/// <summary>
/// Interface do dispatcher CQRS nativo — despacha queries e commands para seus handlers.
/// Implementação usa ServiceProvider (sem MediatR).
/// </summary>
public interface IDispatcher
{
    Task<TResult> QueryAsync<TResult>(IQuery<TResult> query, CancellationToken cancellationToken = default);
}
