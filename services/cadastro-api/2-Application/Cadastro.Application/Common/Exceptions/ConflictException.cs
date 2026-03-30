namespace Cadastro.Application.Common.Exceptions;

/// <summary>
/// Exception lançada quando há conflito de estado — ex: documento CPF/CNPJ duplicado (RF-05)
/// ou quando um titular com vínculos é excluído (RF-23).
/// Mapeada para HTTP 409 pelo GlobalExceptionHandler.
/// </summary>
public class ConflictException : Exception
{
    public ConflictException(string message) : base(message)
    {
    }
}
