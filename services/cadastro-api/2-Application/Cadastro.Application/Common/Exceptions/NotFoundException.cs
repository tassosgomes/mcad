namespace Cadastro.Application.Common.Exceptions;

/// <summary>
/// Exception lançada quando um recurso solicitado não é encontrado.
/// Mapeada para HTTP 404 pelo GlobalExceptionHandler.
/// </summary>
public class NotFoundException : Exception
{
    public string ResourceName { get; }
    public object ResourceId { get; }

    public NotFoundException(string resourceName, object resourceId)
        : base($"{resourceName} with ID '{resourceId}' was not found.")
    {
        ResourceName = resourceName;
        ResourceId = resourceId;
    }
}
