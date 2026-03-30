namespace Cadastro.Application.Common.CQRS;

/// <summary>
/// Contrato para handlers de queries CQRS.
/// </summary>
public interface IQueryHandler<in TQuery, TResult>
    where TQuery : IQuery<TResult>
{
    Task<TResult> HandleAsync(TQuery query, CancellationToken cancellationToken);
}
