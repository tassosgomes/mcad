namespace Cadastro.Application.Common.Exceptions;

/// <summary>
/// Exception lançada quando a validação de campos de entrada falha (FluentValidation).
/// Mapeada para HTTP 400 pelo GlobalExceptionHandler.
/// Contém a lista de erros de validação.
/// </summary>
public class ValidationException : Exception
{
    public IReadOnlyDictionary<string, string[]> Errors { get; }

    public ValidationException(string message) : base(message)
    {
        Errors = new Dictionary<string, string[]>();
    }

    public ValidationException(IDictionary<string, string[]> errors)
        : base("One or more validation errors occurred.")
    {
        Errors = errors.AsReadOnly();
    }
}
