using Cadastro.Application.Common.Exceptions;
using Cadastro.Domain.Exceptions;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace Cadastro.API.Infrastructure;

/// <summary>
/// Global Exception Handler — captura exceções não tratadas e retorna ProblemDetails (RFC 7807).
/// Registrado em Program.cs via AddExceptionHandler.
/// Mapeamentos:
/// - NotFoundException → 404
/// - ConflictException → 409
/// - ValidationException → 400
/// - DomainException → 422
/// - Exception → 500
/// </summary>
public class GlobalExceptionHandler : IExceptionHandler
{
    private readonly ILogger<GlobalExceptionHandler> _logger;

    public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger)
    {
        _logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        _logger.LogError(
            exception,
            "Unhandled exception: {ExceptionType} — {Message}",
            exception.GetType().Name,
            exception.Message);

        var (statusCode, title) = exception switch
        {
            NotFoundException => (StatusCodes.Status404NotFound, "Resource Not Found"),
            ConflictException => (StatusCodes.Status409Conflict, "Conflict"),
            Cadastro.Application.Common.Exceptions.ValidationException => (StatusCodes.Status400BadRequest, "Validation Error"),
            DomainException => (StatusCodes.Status422UnprocessableEntity, "Unprocessable Entity"),
            ExternalServiceException => (StatusCodes.Status502BadGateway, "Bad Gateway"),
            DepuracaoNecessariaException => (StatusCodes.Status409Conflict, "Depuração Necessária"),
            _ => (StatusCodes.Status500InternalServerError, "Internal Server Error")
        };
        var problemDetails = new ProblemDetails
        {
            Status = statusCode,
            Title = title,
            Detail = exception.Message,
            Instance = httpContext.Request.Path
        };

        if (exception is DepuracaoNecessariaException depException)
        {
            problemDetails.Extensions["code"] = depException.Code;
        }

        httpContext.Response.StatusCode = statusCode;
        await httpContext.Response.WriteAsJsonAsync(problemDetails, cancellationToken);
        return true;
    }
}

