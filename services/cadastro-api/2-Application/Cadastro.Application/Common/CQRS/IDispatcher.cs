namespace Cadastro.Application.Common.CQRS;

/// <summary>
/// Interface do dispatcher CQRS nativo — despacha queries e commands para seus handlers.
/// Implementação usa ServiceProvider (sem MediatR).
/// </summary>
public interface IDispatcher
{
    Task<TResult> QueryAsync<TResult>(IQuery<TResult> query, CancellationToken cancellationToken = default);

    /// <summary>
    /// Despacha um command para o handler correspondente.
    /// Adicionado em F02 — primeira feature com operações de escrita.
    /// </summary>
    Task<TResult> SendAsync<TResult>(ICommand<TResult> command, CancellationToken cancellationToken = default);
}

