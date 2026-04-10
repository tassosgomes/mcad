namespace Cadastro.Domain.Exceptions;

/// <summary>
/// Exception lançada quando uma operação é bloqueada pelo estado atual da entidade.
/// Ex: tentar editar uma obra DEPURADA, em DOMÍNIO_PÚBLICO ou BLOQUEADA.
/// Mapeada para HTTP 409 pelo GlobalExceptionHandler.
/// </summary>
public class StatusConflictException : Exception
{
    public StatusConflictException(string message) : base(message)
    {
    }
}
