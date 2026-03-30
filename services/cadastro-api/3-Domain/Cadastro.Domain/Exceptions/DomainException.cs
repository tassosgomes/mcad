namespace Cadastro.Domain.Exceptions;

/// <summary>
/// Exception base para regras de domínio.
/// Lançada por Value Objects e Entidades quando uma invariante de domínio é violada.
/// Mapeada para HTTP 422 pelo GlobalExceptionHandler.
/// </summary>
public class DomainException : Exception
{
    public DomainException(string message) : base(message)
    {
    }

    public DomainException(string message, Exception innerException) : base(message, innerException)
    {
    }
}
